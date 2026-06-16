'use strict';

const crypto = require('crypto');
const { Entrega, Rastreamento } = require('../models');
const { sequelize } = require('../config/database');
const logger = require('../config/logger');
const notificacaoService = require('./notificacaoService');

// ---------------------------------------------------------------------------
// Constantes e máquina de estados
// ---------------------------------------------------------------------------

const STATUS_VALIDOS = ['PENDENTE', 'ATRIBUIDA', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA'];

const TRANSICOES = {
  PENDENTE: ['ATRIBUIDA', 'CANCELADA'],
  ATRIBUIDA: ['EM_TRANSITO', 'PENDENTE', 'CANCELADA'],
  EM_TRANSITO: ['ENTREGUE', 'CANCELADA'],
  ENTREGUE: [],
  CANCELADA: [],
};

const MIN_POR_KM = 2;

// ---------------------------------------------------------------------------
// Classe de erro de negócio
// ---------------------------------------------------------------------------

class AppError extends Error {
  constructor(status, publicMessage, extra) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
    this.extra = extra || null;
  }
}

// ---------------------------------------------------------------------------
// Funções puras
// ---------------------------------------------------------------------------

function gerarNumeroPedido() {
  return 'PED-' + crypto.randomUUID();
}

/**
 * Calcula distância em km usando a fórmula de Haversine.
 * Retorna null se qualquer coordenada estiver ausente.
 */
function calcularDistanciaKm(oLat, oLng, dLat, dLng) {
  if (oLat == null || oLng == null || dLat == null || dLng == null) {
    return null;
  }

  const R = 6371; // raio da Terra em km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLatRad = toRad(dLat - oLat);
  const dLngRad = toRad(dLng - oLng);

  const a =
    Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
    Math.cos(toRad(oLat)) *
      Math.cos(toRad(dLat)) *
      Math.sin(dLngRad / 2) *
      Math.sin(dLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calcularTempoEstimado(distanciaKm) {
  if (distanciaKm == null) return null;
  return Math.ceil(distanciaKm * MIN_POR_KM);
}

function transicaoValida(de, para) {
  const permitidas = TRANSICOES[de];
  if (!permitidas) return false;
  return permitidas.includes(para);
}

// ---------------------------------------------------------------------------
// Orquestração
// ---------------------------------------------------------------------------

async function listarEntregas(filtros) {
  const where = {};

  if (filtros.veiculo) {
    where.veiculo_placa = filtros.veiculo;
  }
  if (filtros.status) {
    where.status = filtros.status.toUpperCase();
  }
  if (filtros.motorista_id) {
    where.motorista_id = filtros.motorista_id;
  }

  return Entrega.findAll({
    where,
    order: [['data_criacao', 'DESC']],
    include: [
      {
        model: Rastreamento,
        as: 'rastreamentos',
        limit: 5,
        order: [['data_evento', 'DESC']],
      },
    ],
  });
}

async function buscarPorId(id) {
  const entrega = await Entrega.findByPk(id, {
    include: [
      {
        model: Rastreamento,
        as: 'rastreamentos',
        order: [['data_evento', 'DESC']],
      },
    ],
  });
  if (!entrega) {
    throw new AppError(404, 'Entrega não encontrada');
  }
  return entrega;
}

async function buscarPorPedido(numero) {
  const entrega = await Entrega.findOne({ where: { numero_pedido: numero } });
  if (!entrega) {
    throw new AppError(404, 'Pedido não encontrado');
  }
  return entrega;
}

async function obterEstatisticas() {
  const { fn, col, literal } = sequelize.constructor;

  const rows = await Entrega.findAll({
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'total'],
      [fn('COALESCE', fn('AVG', col('distancia_km')), literal('0')), 'distancia_media'],
      [fn('COALESCE', fn('AVG', col('peso_kg')), literal('0')), 'peso_medio'],
    ],
    group: ['status'],
    raw: true,
  });

  const total = rows.reduce((acc, r) => acc + parseInt(r.total, 10), 0);

  return {
    total,
    por_status: rows,
    gerado_em: new Date().toISOString(),
  };
}

async function criarEntrega(dados) {
  const {
    origem_endereco,
    destino_endereco,
    peso_kg,
    observacoes,
    origem_lat,
    origem_lng,
    destino_lat,
    destino_lng,
  } = dados;

  const numeroPedido = gerarNumeroPedido();
  const distanciaKm = calcularDistanciaKm(origem_lat, origem_lng, destino_lat, destino_lng);
  const tempoEstimado = calcularTempoEstimado(distanciaKm);

  const entrega = await Entrega.create({
    numero_pedido: numeroPedido,
    origem_endereco,
    destino_endereco,
    origem_lat: origem_lat || null,
    origem_lng: origem_lng || null,
    destino_lat: destino_lat || null,
    destino_lng: destino_lng || null,
    peso_kg: peso_kg || null,
    distancia_km: distanciaKm,
    tempo_estimado_minutos: tempoEstimado,
    status: 'PENDENTE',
    observacoes: observacoes || null,
    data_criacao: new Date(),
    data_atualizacao: new Date(),
  });

  await Rastreamento.create({
    entrega_id: entrega.id,
    evento: 'PEDIDO_CRIADO',
    descricao: 'Pedido de entrega criado: ' + numeroPedido,
    data_evento: new Date(),
  });

  logger.info('Entrega criada', { numero_pedido: numeroPedido });

  notificacaoService.notificarEntregaCriada(entrega);

  return entrega;
}

async function atualizarEntrega(id, dados) {
  const entrega = await Entrega.findByPk(id);
  if (!entrega) {
    throw new AppError(404, 'Entrega não encontrada');
  }

  const { origem_endereco, destino_endereco, peso_kg, observacoes } = dados;

  if (origem_endereco) entrega.origem_endereco = origem_endereco;
  if (destino_endereco) entrega.destino_endereco = destino_endereco;
  if (peso_kg !== undefined) entrega.peso_kg = peso_kg;
  if (observacoes !== undefined) entrega.observacoes = observacoes;
  entrega.data_atualizacao = new Date();

  await entrega.save();
  return entrega;
}

async function atualizarStatus(id, novoStatus) {
  const entrega = await Entrega.findByPk(id);
  if (!entrega) {
    throw new AppError(404, 'Entrega não encontrada');
  }

  if (!STATUS_VALIDOS.includes(novoStatus)) {
    throw new AppError(400, 'Status inválido', { statusValidos: STATUS_VALIDOS });
  }

  if (!transicaoValida(entrega.status, novoStatus)) {
    throw new AppError(
      400,
      'Transição de status inválida: ' + entrega.status + ' -> ' + novoStatus,
      { statusValidos: STATUS_VALIDOS }
    );
  }

  const statusAnterior = entrega.status;
  entrega.status = novoStatus;
  entrega.data_atualizacao = new Date();

  if (novoStatus === 'EM_TRANSITO') {
    entrega.data_coleta = new Date();
  }
  if (novoStatus === 'ENTREGUE') {
    entrega.data_entrega = new Date();
  }

  await entrega.save();

  await Rastreamento.create({
    entrega_id: entrega.id,
    evento: 'STATUS_ALTERADO',
    descricao: 'Status alterado de ' + statusAnterior + ' para ' + novoStatus,
    data_evento: new Date(),
  });

  logger.info('Status atualizado', {
    numero_pedido: entrega.numero_pedido,
    de: statusAnterior,
    para: novoStatus,
  });

  notificacaoService.notificarMudancaStatus(entrega, statusAnterior, novoStatus);

  if (novoStatus === 'ENTREGUE') {
    notificacaoService.notificarEntregaConcluida(entrega);
  }

  return entrega;
}

async function atribuirEntrega(id, dados) {
  const entrega = await Entrega.findByPk(id);
  if (!entrega) {
    throw new AppError(404, 'Entrega não encontrada');
  }

  const { veiculo_placa, motorista_id, motorista_nome, veiculo_modelo } = dados;

  entrega.veiculo_placa = veiculo_placa;
  entrega.motorista_id = motorista_id;
  entrega.motorista_nome = motorista_nome || null;
  entrega.veiculo_modelo = veiculo_modelo || null;
  entrega.status = 'ATRIBUIDA';
  entrega.data_atualizacao = new Date();

  await entrega.save();

  await Rastreamento.create({
    entrega_id: entrega.id,
    evento: 'ENTREGA_ATRIBUIDA',
    descricao: 'Atribuída ao veículo ' + veiculo_placa + ' e motorista #' + motorista_id,
    data_evento: new Date(),
  });

  logger.info('Entrega atribuída', {
    numero_pedido: entrega.numero_pedido,
    veiculo_placa,
  });

  return entrega;
}

async function cancelarEntrega(id) {
  const entrega = await Entrega.findByPk(id);
  if (!entrega) {
    throw new AppError(404, 'Entrega não encontrada');
  }

  entrega.status = 'CANCELADA';
  entrega.data_atualizacao = new Date();

  await entrega.save();

  await Rastreamento.create({
    entrega_id: entrega.id,
    evento: 'ENTREGA_CANCELADA',
    descricao: 'Entrega cancelada',
    data_evento: new Date(),
  });

  logger.info('Entrega cancelada', { numero_pedido: entrega.numero_pedido });

  return entrega;
}

module.exports = {
  AppError,
  STATUS_VALIDOS,
  TRANSICOES,
  gerarNumeroPedido,
  calcularDistanciaKm,
  calcularTempoEstimado,
  transicaoValida,
  listarEntregas,
  buscarPorId,
  buscarPorPedido,
  obterEstatisticas,
  criarEntrega,
  atualizarEntrega,
  atualizarStatus,
  atribuirEntrega,
  cancelarEntrega,
};
