'use strict';

/**
 * Testes unitários para src/services/entregaService.js
 *
 * Estratégia: mock dos models Sequelize e do notificacaoService para
 * testar a lógica do service em isolamento total.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../models', () => {
  const Entrega = {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const Rastreamento = {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };
  return { Entrega, Rastreamento };
});

jest.mock('./notificacaoService', () => ({
  notificarEntregaCriada: jest.fn(),
  notificarMudancaStatus: jest.fn(),
  notificarEntregaConcluida: jest.fn(),
  notificarAtraso: jest.fn(),
  enviarNotificacao: jest.fn(),
}));

jest.mock('../config/database', () => {
  // Simula sequelize.constructor com fn, col, literal
  const fn = jest.fn((...args) => ({ fn: args[0], args: args.slice(1) }));
  const col = jest.fn((c) => ({ col: c }));
  const literal = jest.fn((v) => ({ literal: v }));
  const QueryTypes = { SELECT: 'SELECT' };

  const sequelize = {
    query: jest.fn(),
    constructor: { fn, col, literal, QueryTypes },
  };

  return { sequelize };
});

// ---------------------------------------------------------------------------
// Imports (após mocks)
// ---------------------------------------------------------------------------

const {
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
} = require('./entregaService');

const { Entrega, Rastreamento } = require('../models');
const notificacaoService = require('./notificacaoService');

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeEntregaInstance(overrides = {}) {
  return Object.assign(
    {
      id: 1,
      numero_pedido: 'PED-TEST-1',
      status: 'PENDENTE',
      origem_endereco: 'Rua A, 1',
      destino_endereco: 'Rua B, 2',
      veiculo_placa: null,
      motorista_id: null,
      motorista_nome: null,
      veiculo_modelo: null,
      peso_kg: null,
      distancia_km: null,
      tempo_estimado_minutos: null,
      observacoes: null,
      data_criacao: new Date('2024-01-01'),
      data_atualizacao: new Date('2024-01-01'),
      data_coleta: null,
      data_entrega: null,
      save: jest.fn().mockResolvedValue(undefined),
    },
    overrides
  );
}

// ---------------------------------------------------------------------------
// Funções puras
// ---------------------------------------------------------------------------

describe('gerarNumeroPedido()', () => {
  test('retorna string com prefixo PED-', () => {
    const numero = gerarNumeroPedido();
    expect(numero).toMatch(/^PED-/);
  });

  test('gera valores únicos em chamadas consecutivas', () => {
    const n1 = gerarNumeroPedido();
    const n2 = gerarNumeroPedido();
    expect(n1).not.toBe(n2);
  });
});

describe('calcularDistanciaKm()', () => {
  test('retorna null quando qualquer coordenada está ausente', () => {
    expect(calcularDistanciaKm(null, -46.6333, -23.6, -46.7)).toBeNull();
    expect(calcularDistanciaKm(-23.5505, null, -23.6, -46.7)).toBeNull();
    expect(calcularDistanciaKm(-23.5505, -46.6333, null, -46.7)).toBeNull();
    expect(calcularDistanciaKm(-23.5505, -46.6333, -23.6, null)).toBeNull();
    expect(calcularDistanciaKm(null, null, null, null)).toBeNull();
  });

  test('calcula distância conhecida com Haversine (São Paulo ~8.5 km)', () => {
    // Coordenadas aproximadas dentro de SP
    const dist = calcularDistanciaKm(-23.5505, -46.6333, -23.6, -46.7);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(50); // sanidade: menos de 50 km
    expect(typeof dist).toBe('number');
  });

  test('retorna 0 (ou muito próximo) para coordenadas idênticas', () => {
    const dist = calcularDistanciaKm(-23.5505, -46.6333, -23.5505, -46.6333);
    expect(dist).toBeCloseTo(0, 5);
  });
});

describe('calcularTempoEstimado()', () => {
  test('retorna null quando distanciaKm é null', () => {
    expect(calcularTempoEstimado(null)).toBeNull();
  });

  test('retorna Math.ceil(distancia * 2) para distâncias positivas', () => {
    expect(calcularTempoEstimado(10)).toBe(20);
    expect(calcularTempoEstimado(10.5)).toBe(21);
    expect(calcularTempoEstimado(0.1)).toBe(1);
  });
});

describe('transicaoValida()', () => {
  test('PENDENTE -> ATRIBUIDA é válida', () => {
    expect(transicaoValida('PENDENTE', 'ATRIBUIDA')).toBe(true);
  });

  test('PENDENTE -> CANCELADA é válida', () => {
    expect(transicaoValida('PENDENTE', 'CANCELADA')).toBe(true);
  });

  test('ATRIBUIDA -> EM_TRANSITO é válida', () => {
    expect(transicaoValida('ATRIBUIDA', 'EM_TRANSITO')).toBe(true);
  });

  test('ATRIBUIDA -> PENDENTE é válida', () => {
    expect(transicaoValida('ATRIBUIDA', 'PENDENTE')).toBe(true);
  });

  test('ATRIBUIDA -> CANCELADA é válida', () => {
    expect(transicaoValida('ATRIBUIDA', 'CANCELADA')).toBe(true);
  });

  test('EM_TRANSITO -> ENTREGUE é válida', () => {
    expect(transicaoValida('EM_TRANSITO', 'ENTREGUE')).toBe(true);
  });

  test('EM_TRANSITO -> CANCELADA é válida', () => {
    expect(transicaoValida('EM_TRANSITO', 'CANCELADA')).toBe(true);
  });

  test('ENTREGUE -> PENDENTE é inválida', () => {
    expect(transicaoValida('ENTREGUE', 'PENDENTE')).toBe(false);
  });

  test('CANCELADA -> PENDENTE é inválida', () => {
    expect(transicaoValida('CANCELADA', 'PENDENTE')).toBe(false);
  });

  test('PENDENTE -> EM_TRANSITO é inválida', () => {
    expect(transicaoValida('PENDENTE', 'EM_TRANSITO')).toBe(false);
  });

  test('estado desconhecido retorna false', () => {
    expect(transicaoValida('INEXISTENTE', 'PENDENTE')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AppError
// ---------------------------------------------------------------------------

describe('AppError', () => {
  test('armazena status, publicMessage e extra', () => {
    const err = new AppError(404, 'Não encontrado', { foo: 'bar' });
    expect(err.status).toBe(404);
    expect(err.publicMessage).toBe('Não encontrado');
    expect(err.extra).toEqual({ foo: 'bar' });
    expect(err).toBeInstanceOf(Error);
  });

  test('extra é null por padrão', () => {
    const err = new AppError(500, 'Erro interno');
    expect(err.extra).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Orquestração — listarEntregas
// ---------------------------------------------------------------------------

describe('listarEntregas()', () => {
  test('chama Entrega.findAll com where vazio quando sem filtros', async () => {
    Entrega.findAll.mockResolvedValue([]);
    await listarEntregas({});
    expect(Entrega.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  test('aplica filtro veiculo_placa', async () => {
    Entrega.findAll.mockResolvedValue([]);
    await listarEntregas({ veiculo: 'ABC1234' });
    expect(Entrega.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { veiculo_placa: 'ABC1234' } })
    );
  });

  test('aplica filtro status em maiúsculas', async () => {
    Entrega.findAll.mockResolvedValue([]);
    await listarEntregas({ status: 'pendente' });
    expect(Entrega.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDENTE' } })
    );
  });

  test('aplica filtro motorista_id', async () => {
    Entrega.findAll.mockResolvedValue([]);
    await listarEntregas({ motorista_id: '7' });
    expect(Entrega.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { motorista_id: '7' } })
    );
  });
});

// ---------------------------------------------------------------------------
// Orquestração — buscarPorId
// ---------------------------------------------------------------------------

describe('buscarPorId()', () => {
  test('retorna entrega quando encontrada', async () => {
    const entrega = makeEntregaInstance();
    Entrega.findByPk.mockResolvedValue(entrega);
    const result = await buscarPorId(1);
    expect(result).toBe(entrega);
  });

  test('lança AppError 404 quando não encontrada', async () => {
    Entrega.findByPk.mockResolvedValue(null);
    await expect(buscarPorId(999)).rejects.toMatchObject({
      status: 404,
      publicMessage: 'Entrega não encontrada',
    });
  });
});

// ---------------------------------------------------------------------------
// Orquestração — buscarPorPedido
// ---------------------------------------------------------------------------

describe('buscarPorPedido()', () => {
  test('retorna entrega quando encontrada', async () => {
    const entrega = makeEntregaInstance({ numero_pedido: 'PED-XYZ' });
    Entrega.findOne.mockResolvedValue(entrega);
    const result = await buscarPorPedido('PED-XYZ');
    expect(result).toBe(entrega);
  });

  test('lança AppError 404 quando não encontrada', async () => {
    Entrega.findOne.mockResolvedValue(null);
    await expect(buscarPorPedido('INEXISTENTE')).rejects.toMatchObject({
      status: 404,
      publicMessage: 'Pedido não encontrado',
    });
  });
});

// ---------------------------------------------------------------------------
// Orquestração — obterEstatisticas
// ---------------------------------------------------------------------------

describe('obterEstatisticas()', () => {
  test('retorna total somado, por_status e gerado_em', async () => {
    const rows = [
      { status: 'PENDENTE', total: '3', distancia_media: '10.5', peso_medio: '5.0' },
      { status: 'ENTREGUE', total: '7', distancia_media: '20.0', peso_medio: '8.0' },
    ];
    Entrega.findAll.mockResolvedValue(rows);

    const result = await obterEstatisticas();

    expect(result.total).toBe(10);
    expect(result.por_status).toEqual(rows);
    expect(result).toHaveProperty('gerado_em');
  });
});

// ---------------------------------------------------------------------------
// Orquestração — criarEntrega
// ---------------------------------------------------------------------------

describe('criarEntrega()', () => {
  test('cria entrega com distância calculada e dispara notificação', async () => {
    const entregaCriada = makeEntregaInstance({ distancia_km: 8.5 });
    Entrega.create.mockResolvedValue(entregaCriada);
    Rastreamento.create.mockResolvedValue({ id: 10 });
    notificacaoService.notificarEntregaCriada.mockImplementation(() => {});

    const result = await criarEntrega({
      origem_endereco: 'Rua A',
      destino_endereco: 'Rua B',
      origem_lat: -23.5505,
      origem_lng: -46.6333,
      destino_lat: -23.6,
      destino_lng: -46.7,
    });

    expect(Entrega.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PENDENTE',
        distancia_km: expect.any(Number),
        tempo_estimado_minutos: expect.any(Number),
      })
    );
    expect(Rastreamento.create).toHaveBeenCalledWith(
      expect.objectContaining({ evento: 'PEDIDO_CRIADO' })
    );
    expect(notificacaoService.notificarEntregaCriada).toHaveBeenCalledWith(entregaCriada);
    expect(result).toBe(entregaCriada);
  });

  test('cria entrega sem coordenadas — distancia_km e tempo_estimado ficam null', async () => {
    const entregaCriada = makeEntregaInstance({ distancia_km: null, tempo_estimado_minutos: null });
    Entrega.create.mockResolvedValue(entregaCriada);
    Rastreamento.create.mockResolvedValue({ id: 11 });

    await criarEntrega({
      origem_endereco: 'Rua C',
      destino_endereco: 'Rua D',
    });

    expect(Entrega.create).toHaveBeenCalledWith(
      expect.objectContaining({ distancia_km: null, tempo_estimado_minutos: null })
    );
  });
});

// ---------------------------------------------------------------------------
// Orquestração — atualizarEntrega
// ---------------------------------------------------------------------------

describe('atualizarEntrega()', () => {
  test('atualiza campos e chama save()', async () => {
    const entrega = makeEntregaInstance();
    Entrega.findByPk.mockResolvedValue(entrega);

    const result = await atualizarEntrega(1, { origem_endereco: 'Nova Rua', peso_kg: 5 });

    expect(entrega.origem_endereco).toBe('Nova Rua');
    expect(entrega.peso_kg).toBe(5);
    expect(entrega.save).toHaveBeenCalled();
    expect(result).toBe(entrega);
  });

  test('não atualiza campos ausentes no payload', async () => {
    const entrega = makeEntregaInstance({ origem_endereco: 'Rua Antiga', peso_kg: 5 });
    Entrega.findByPk.mockResolvedValue(entrega);

    // nenhum campo enviado — nenhum campo deve mudar além de data_atualizacao
    await atualizarEntrega(1, {});

    expect(entrega.origem_endereco).toBe('Rua Antiga');
    expect(entrega.peso_kg).toBe(5);
    expect(entrega.save).toHaveBeenCalled();
  });

  test('atualiza destino_endereco e observacoes quando fornecidos', async () => {
    const entrega = makeEntregaInstance({
      destino_endereco: 'Rua Antiga Destino',
      observacoes: null,
    });
    Entrega.findByPk.mockResolvedValue(entrega);

    await atualizarEntrega(1, { destino_endereco: 'Rua Nova Destino', observacoes: 'fragil' });

    expect(entrega.destino_endereco).toBe('Rua Nova Destino');
    expect(entrega.observacoes).toBe('fragil');
    expect(entrega.save).toHaveBeenCalled();
  });

  test('lança AppError 404 quando não encontrada', async () => {
    Entrega.findByPk.mockResolvedValue(null);
    await expect(atualizarEntrega(999, {})).rejects.toMatchObject({ status: 404 });
  });
});

// ---------------------------------------------------------------------------
// Orquestração — atualizarStatus
// ---------------------------------------------------------------------------

describe('atualizarStatus()', () => {
  test('transição válida ATRIBUIDA -> EM_TRANSITO define data_coleta', async () => {
    const entrega = makeEntregaInstance({ status: 'ATRIBUIDA' });
    Entrega.findByPk.mockResolvedValue(entrega);
    Rastreamento.create.mockResolvedValue({ id: 20 });
    notificacaoService.notificarMudancaStatus.mockImplementation(() => {});
    notificacaoService.notificarEntregaConcluida.mockImplementation(() => {});

    const result = await atualizarStatus(1, 'EM_TRANSITO');

    expect(entrega.status).toBe('EM_TRANSITO');
    expect(entrega.data_coleta).toBeInstanceOf(Date);
    expect(entrega.save).toHaveBeenCalled();
    expect(Rastreamento.create).toHaveBeenCalledWith(
      expect.objectContaining({ evento: 'STATUS_ALTERADO' })
    );
    expect(notificacaoService.notificarMudancaStatus).toHaveBeenCalledWith(
      entrega,
      'ATRIBUIDA',
      'EM_TRANSITO'
    );
    expect(notificacaoService.notificarEntregaConcluida).not.toHaveBeenCalled();
  });

  test('transição EM_TRANSITO -> ENTREGUE define data_entrega e dispara notificação concluída', async () => {
    const entrega = makeEntregaInstance({ status: 'EM_TRANSITO' });
    Entrega.findByPk.mockResolvedValue(entrega);
    Rastreamento.create.mockResolvedValue({ id: 21 });
    notificacaoService.notificarMudancaStatus.mockImplementation(() => {});
    notificacaoService.notificarEntregaConcluida.mockImplementation(() => {});

    await atualizarStatus(1, 'ENTREGUE');

    expect(entrega.data_entrega).toBeInstanceOf(Date);
    expect(notificacaoService.notificarEntregaConcluida).toHaveBeenCalledWith(entrega);
  });

  test('lança AppError 404 quando entrega não encontrada', async () => {
    Entrega.findByPk.mockResolvedValue(null);
    await expect(atualizarStatus(999, 'ENTREGUE')).rejects.toMatchObject({ status: 404 });
  });

  test('lança AppError 400 para status inválido', async () => {
    const entrega = makeEntregaInstance();
    Entrega.findByPk.mockResolvedValue(entrega);
    await expect(atualizarStatus(1, 'INVALIDO')).rejects.toMatchObject({
      status: 400,
      publicMessage: 'Status inválido',
    });
  });

  test('lança AppError 400 para transição inválida ENTREGUE -> PENDENTE', async () => {
    const entrega = makeEntregaInstance({ status: 'ENTREGUE' });
    Entrega.findByPk.mockResolvedValue(entrega);
    await expect(atualizarStatus(1, 'PENDENTE')).rejects.toMatchObject({
      status: 400,
    });
  });
});

// ---------------------------------------------------------------------------
// Orquestração — atribuirEntrega
// ---------------------------------------------------------------------------

describe('atribuirEntrega()', () => {
  test('atribui veículo e motorista, status vira ATRIBUIDA', async () => {
    const entrega = makeEntregaInstance();
    Entrega.findByPk.mockResolvedValue(entrega);
    Rastreamento.create.mockResolvedValue({ id: 30 });

    const result = await atribuirEntrega(1, {
      veiculo_placa: 'XYZ9999',
      motorista_id: 42,
      motorista_nome: 'João Silva',
      veiculo_modelo: 'Fiat Fiorino',
    });

    expect(entrega.veiculo_placa).toBe('XYZ9999');
    expect(entrega.motorista_id).toBe(42);
    expect(entrega.status).toBe('ATRIBUIDA');
    expect(entrega.save).toHaveBeenCalled();
    expect(Rastreamento.create).toHaveBeenCalledWith(
      expect.objectContaining({ evento: 'ENTREGA_ATRIBUIDA' })
    );
    expect(result).toBe(entrega);
  });

  test('atribui sem motorista_nome e veiculo_modelo — ficam null', async () => {
    const entrega = makeEntregaInstance();
    Entrega.findByPk.mockResolvedValue(entrega);
    Rastreamento.create.mockResolvedValue({ id: 31 });

    await atribuirEntrega(1, { veiculo_placa: 'XYZ9999', motorista_id: 42 });

    expect(entrega.motorista_nome).toBeNull();
    expect(entrega.veiculo_modelo).toBeNull();
  });

  test('lança AppError 404 quando não encontrada', async () => {
    Entrega.findByPk.mockResolvedValue(null);
    await expect(atribuirEntrega(999, { veiculo_placa: 'X', motorista_id: 1 })).rejects.toMatchObject({
      status: 404,
    });
  });
});

// ---------------------------------------------------------------------------
// Orquestração — cancelarEntrega
// ---------------------------------------------------------------------------

describe('cancelarEntrega()', () => {
  test('muda status para CANCELADA e cria evento', async () => {
    const entrega = makeEntregaInstance({ status: 'PENDENTE' });
    Entrega.findByPk.mockResolvedValue(entrega);
    Rastreamento.create.mockResolvedValue({ id: 40 });

    const result = await cancelarEntrega(1);

    expect(entrega.status).toBe('CANCELADA');
    expect(entrega.save).toHaveBeenCalled();
    expect(Rastreamento.create).toHaveBeenCalledWith(
      expect.objectContaining({ evento: 'ENTREGA_CANCELADA' })
    );
    expect(result).toBe(entrega);
  });

  test('lança AppError 404 quando não encontrada', async () => {
    Entrega.findByPk.mockResolvedValue(null);
    await expect(cancelarEntrega(999)).rejects.toMatchObject({ status: 404 });
  });
});
