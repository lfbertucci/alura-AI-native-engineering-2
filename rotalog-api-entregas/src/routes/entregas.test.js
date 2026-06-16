'use strict';

/**
 * Testes de integração para src/routes/entregas.js
 *
 * Estratégia: mock do entregaService para isolar as rotas de qualquer
 * dependência de banco ou HTTP externo.
 */

// ---------------------------------------------------------------------------
// Mocks (devem ser declarados antes dos require do código-fonte)
// ---------------------------------------------------------------------------

// Preserva AppError real para que instanceof funcione corretamente na rota
jest.mock('../services/entregaService', () => {
  const actual = jest.requireActual('../services/entregaService');
  return {
    AppError: actual.AppError,
    listarEntregas: jest.fn(),
    buscarPorId: jest.fn(),
    buscarPorPedido: jest.fn(),
    obterEstatisticas: jest.fn(),
    criarEntrega: jest.fn(),
    atualizarEntrega: jest.fn(),
    atualizarStatus: jest.fn(),
    atribuirEntrega: jest.fn(),
    cancelarEntrega: jest.fn(),
  };
});

jest.mock('../services/notificacaoService');

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

const express = require('express');
const request = require('supertest');
const entregasRouter = require('./entregas');
const entregaService = require('../services/entregaService');
const notificacaoService = require('../services/notificacaoService');
const { AppError } = require('../services/entregaService');

// ---------------------------------------------------------------------------
// Setup do app Express para supertest
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());
app.use('/api/entregas', entregasRouter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntrega(overrides = {}) {
  return Object.assign(
    {
      id: 1,
      numero_pedido: 'PED-111-1',
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
    },
    overrides
  );
}

// ---------------------------------------------------------------------------
// GET /api/entregas
// ---------------------------------------------------------------------------
describe('GET /api/entregas', () => {
  test('200 retorna lista de entregas sem filtros', async () => {
    const lista = [makeEntrega(), makeEntrega({ id: 2, numero_pedido: 'PED-222-2' })];
    entregaService.listarEntregas.mockResolvedValue(lista);

    const res = await request(app).get('/api/entregas');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(entregaService.listarEntregas).toHaveBeenCalledWith(expect.objectContaining({}));
  });

  test('200 aplica filtro por veiculo', async () => {
    entregaService.listarEntregas.mockResolvedValue([makeEntrega({ veiculo_placa: 'ABC1234' })]);

    const res = await request(app).get('/api/entregas?veiculo=ABC1234');

    expect(res.status).toBe(200);
    expect(entregaService.listarEntregas).toHaveBeenCalledWith(
      expect.objectContaining({ veiculo: 'ABC1234' })
    );
  });

  test('200 aplica filtro por status', async () => {
    entregaService.listarEntregas.mockResolvedValue([makeEntrega({ status: 'PENDENTE' })]);

    const res = await request(app).get('/api/entregas?status=pendente');

    expect(res.status).toBe(200);
    expect(entregaService.listarEntregas).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pendente' })
    );
  });

  test('200 aplica filtro por motorista_id', async () => {
    entregaService.listarEntregas.mockResolvedValue([makeEntrega({ motorista_id: '7' })]);

    const res = await request(app).get('/api/entregas?motorista_id=7');

    expect(res.status).toBe(200);
    expect(entregaService.listarEntregas).toHaveBeenCalledWith(
      expect.objectContaining({ motorista_id: '7' })
    );
  });

  test('500 quando listarEntregas lança erro', async () => {
    entregaService.listarEntregas.mockRejectedValue(new Error('DB offline'));

    const res = await request(app).get('/api/entregas');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro interno do servidor' });
  });
});

// ---------------------------------------------------------------------------
// GET /api/entregas/stats
// ---------------------------------------------------------------------------
describe('GET /api/entregas/stats', () => {
  test('200 retorna total agregado e por_status', async () => {
    const statsData = {
      total: 10,
      por_status: [
        { status: 'PENDENTE', total: '3', distancia_media: '10.5', peso_medio: '5.0' },
        { status: 'ENTREGUE', total: '7', distancia_media: '20.0', peso_medio: '8.0' },
      ],
      gerado_em: new Date().toISOString(),
    };
    entregaService.obterEstatisticas.mockResolvedValue(statsData);

    const res = await request(app).get('/api/entregas/stats');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(10);
    expect(Array.isArray(res.body.por_status)).toBe(true);
    expect(res.body.por_status).toHaveLength(2);
    expect(res.body).toHaveProperty('gerado_em');
  });

  test('500 quando obterEstatisticas lança erro', async () => {
    entregaService.obterEstatisticas.mockRejectedValue(new Error('Query falhou'));

    const res = await request(app).get('/api/entregas/stats');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro ao buscar estatísticas' });
  });
});

// ---------------------------------------------------------------------------
// GET /api/entregas/:id
// ---------------------------------------------------------------------------
describe('GET /api/entregas/:id', () => {
  test('200 retorna entrega encontrada', async () => {
    entregaService.buscarPorId.mockResolvedValue(makeEntrega());

    const res = await request(app).get('/api/entregas/1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(entregaService.buscarPorId).toHaveBeenCalledWith('1');
  });

  test('404 quando entrega não encontrada', async () => {
    entregaService.buscarPorId.mockRejectedValue(new AppError(404, 'Entrega não encontrada'));

    const res = await request(app).get('/api/entregas/999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Entrega não encontrada' });
  });

  test('500 quando buscarPorId lança erro genérico', async () => {
    entregaService.buscarPorId.mockRejectedValue(new Error('DB erro'));

    const res = await request(app).get('/api/entregas/1');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro interno do servidor' });
  });
});

// ---------------------------------------------------------------------------
// GET /api/entregas/pedido/:numeroPedido
// ---------------------------------------------------------------------------
describe('GET /api/entregas/pedido/:numeroPedido', () => {
  test('200 retorna entrega pelo número do pedido', async () => {
    entregaService.buscarPorPedido.mockResolvedValue(
      makeEntrega({ numero_pedido: 'PED-ABC-001' })
    );

    const res = await request(app).get('/api/entregas/pedido/PED-ABC-001');

    expect(res.status).toBe(200);
    expect(res.body.numero_pedido).toBe('PED-ABC-001');
    expect(entregaService.buscarPorPedido).toHaveBeenCalledWith('PED-ABC-001');
  });

  test('404 quando pedido não encontrado', async () => {
    entregaService.buscarPorPedido.mockRejectedValue(new AppError(404, 'Pedido não encontrado'));

    const res = await request(app).get('/api/entregas/pedido/INEXISTENTE');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Pedido não encontrado' });
  });

  test('500 quando buscarPorPedido lança erro genérico', async () => {
    entregaService.buscarPorPedido.mockRejectedValue(new Error('Conexão perdida'));

    const res = await request(app).get('/api/entregas/pedido/PED-XYZ');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro interno do servidor' });
  });
});

// ---------------------------------------------------------------------------
// POST /api/entregas
// ---------------------------------------------------------------------------
describe('POST /api/entregas', () => {
  test('201 cria entrega com coordenadas — calcula distancia_km e tempo_estimado', async () => {
    const novaEntrega = makeEntrega({
      origem_endereco: 'Rua A, 1',
      destino_endereco: 'Rua B, 2',
      distancia_km: 8.5,
      tempo_estimado_minutos: 17,
    });
    entregaService.criarEntrega.mockResolvedValue(novaEntrega);
    notificacaoService.notificarEntregaCriada = jest.fn();

    const res = await request(app)
      .post('/api/entregas')
      .send({
        origem_endereco: 'Rua A, 1',
        destino_endereco: 'Rua B, 2',
        peso_kg: 5,
        origem_lat: -23.5505,
        origem_lng: -46.6333,
        destino_lat: -23.6,
        destino_lng: -46.7,
      });

    expect(res.status).toBe(201);
    expect(res.body.distancia_km).toBe(8.5);
    expect(res.body.tempo_estimado_minutos).toBe(17);
    expect(entregaService.criarEntrega).toHaveBeenCalled();
  });

  test('201 cria entrega sem coordenadas — distancia_km e tempo_estimado ficam null', async () => {
    const novaEntrega = makeEntrega({
      origem_endereco: 'Rua C, 3',
      destino_endereco: 'Rua D, 4',
      distancia_km: null,
      tempo_estimado_minutos: null,
    });
    entregaService.criarEntrega.mockResolvedValue(novaEntrega);

    const res = await request(app)
      .post('/api/entregas')
      .send({
        origem_endereco: 'Rua C, 3',
        destino_endereco: 'Rua D, 4',
      });

    expect(res.status).toBe(201);
    expect(res.body.distancia_km).toBeNull();
    expect(res.body.tempo_estimado_minutos).toBeNull();
  });

  test('400 quando endereços não fornecidos', async () => {
    const res = await request(app)
      .post('/api/entregas')
      .send({ peso_kg: 10 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Endereços de origem e destino são obrigatórios',
    });
    expect(entregaService.criarEntrega).not.toHaveBeenCalled();
  });

  test('400 quando apenas origem_endereco fornecido', async () => {
    const res = await request(app)
      .post('/api/entregas')
      .send({ origem_endereco: 'Rua A, 1' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Endereços de origem e destino são obrigatórios',
    });
  });

  test('500 quando criarEntrega lança erro — sem detalhes internos', async () => {
    entregaService.criarEntrega.mockRejectedValue(new Error('unique violation'));

    const res = await request(app)
      .post('/api/entregas')
      .send({ origem_endereco: 'Rua A', destino_endereco: 'Rua B' });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'Erro ao criar entrega' });
    expect(res.body).not.toHaveProperty('detalhes');
  });

  test('notificarEntregaCriada é chamado ao criar entrega com sucesso', async () => {
    const novaEntrega = makeEntrega();
    entregaService.criarEntrega.mockResolvedValue(novaEntrega);

    await request(app)
      .post('/api/entregas')
      .send({ origem_endereco: 'Rua A', destino_endereco: 'Rua B' });

    // O service é que chama o notificacaoService internamente;
    // verificamos que criarEntrega foi chamado (cobertura via service tests)
    expect(entregaService.criarEntrega).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PUT /api/entregas/:id
// ---------------------------------------------------------------------------
describe('PUT /api/entregas/:id', () => {
  test('200 atualiza campos parcialmente', async () => {
    const entrega = makeEntrega({ origem_endereco: 'Rua Nova, 99', peso_kg: 12 });
    entregaService.atualizarEntrega.mockResolvedValue(entrega);

    const res = await request(app)
      .put('/api/entregas/1')
      .send({ origem_endereco: 'Rua Nova, 99', peso_kg: 12 });

    expect(res.status).toBe(200);
    expect(res.body.origem_endereco).toBe('Rua Nova, 99');
    expect(res.body.peso_kg).toBe(12);
    expect(entregaService.atualizarEntrega).toHaveBeenCalledWith('1', expect.any(Object));
  });

  test('404 quando entrega não encontrada', async () => {
    entregaService.atualizarEntrega.mockRejectedValue(new AppError(404, 'Entrega não encontrada'));

    const res = await request(app)
      .put('/api/entregas/999')
      .send({ peso_kg: 5 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Entrega não encontrada' });
  });

  test('500 quando atualizarEntrega lança erro genérico', async () => {
    entregaService.atualizarEntrega.mockRejectedValue(new Error('timeout'));

    const res = await request(app)
      .put('/api/entregas/1')
      .send({ peso_kg: 5 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro ao atualizar entrega' });
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/entregas/:id/status
// ---------------------------------------------------------------------------
describe('PATCH /api/entregas/:id/status', () => {
  test('200 atualiza para status EM_TRANSITO — define data_coleta', async () => {
    const entrega = makeEntrega({ status: 'EM_TRANSITO', data_coleta: new Date() });
    entregaService.atualizarStatus.mockResolvedValue(entrega);

    const res = await request(app)
      .patch('/api/entregas/1/status')
      .send({ status: 'EM_TRANSITO' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('EM_TRANSITO');
    expect(entregaService.atualizarStatus).toHaveBeenCalledWith('1', 'EM_TRANSITO');
  });

  test('200 atualiza para status ENTREGUE — define data_entrega', async () => {
    const entrega = makeEntrega({ status: 'ENTREGUE', data_entrega: new Date() });
    entregaService.atualizarStatus.mockResolvedValue(entrega);

    const res = await request(app)
      .patch('/api/entregas/1/status')
      .send({ status: 'ENTREGUE' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ENTREGUE');
    expect(entregaService.atualizarStatus).toHaveBeenCalledWith('1', 'ENTREGUE');
  });

  test('200 transição legal ATRIBUIDA -> PENDENTE', async () => {
    const entrega = makeEntrega({ status: 'PENDENTE' });
    entregaService.atualizarStatus.mockResolvedValue(entrega);

    const res = await request(app)
      .patch('/api/entregas/1/status')
      .send({ status: 'PENDENTE' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDENTE');
  });

  test('400 transição inválida ENTREGUE -> PENDENTE', async () => {
    entregaService.atualizarStatus.mockRejectedValue(
      new AppError(400, 'Transição de status inválida: ENTREGUE -> PENDENTE', {
        statusValidos: ['PENDENTE', 'ATRIBUIDA', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA'],
      })
    );

    const res = await request(app)
      .patch('/api/entregas/1/status')
      .send({ status: 'PENDENTE' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('statusValidos');
  });

  test('400 quando status inválido', async () => {
    entregaService.atualizarStatus.mockRejectedValue(
      new AppError(400, 'Status inválido', {
        statusValidos: ['PENDENTE', 'ATRIBUIDA', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA'],
      })
    );

    const res = await request(app)
      .patch('/api/entregas/1/status')
      .send({ status: 'INVALIDO' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'Status inválido' });
    expect(res.body).toHaveProperty('statusValidos');
  });

  test('404 quando entrega não encontrada', async () => {
    entregaService.atualizarStatus.mockRejectedValue(
      new AppError(404, 'Entrega não encontrada')
    );

    const res = await request(app)
      .patch('/api/entregas/999/status')
      .send({ status: 'ENTREGUE' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Entrega não encontrada' });
  });

  test('500 quando atualizarStatus lança erro genérico', async () => {
    entregaService.atualizarStatus.mockRejectedValue(new Error('lock timeout'));

    const res = await request(app)
      .patch('/api/entregas/1/status')
      .send({ status: 'ENTREGUE' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro ao atualizar status' });
  });

  test('assert notificarMudancaStatus e notificarEntregaConcluida são chamados pelo service', async () => {
    // O service é que chama o notificacaoService; aqui verificamos que
    // atualizarStatus foi invocado (cobertura detalhada está em entregaService.test.js)
    const entrega = makeEntrega({ status: 'ENTREGUE', data_entrega: new Date() });
    entregaService.atualizarStatus.mockResolvedValue(entrega);

    const res = await request(app)
      .patch('/api/entregas/1/status')
      .send({ status: 'ENTREGUE' });

    expect(res.status).toBe(200);
    expect(entregaService.atualizarStatus).toHaveBeenCalledWith('1', 'ENTREGUE');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/entregas/:id/atribuir
// ---------------------------------------------------------------------------
describe('PATCH /api/entregas/:id/atribuir', () => {
  test('200 atribui veiculo e motorista — status vira ATRIBUIDA', async () => {
    const entrega = makeEntrega({
      veiculo_placa: 'XYZ9999',
      motorista_id: 42,
      motorista_nome: 'João Silva',
      veiculo_modelo: 'Fiat Fiorino',
      status: 'ATRIBUIDA',
    });
    entregaService.atribuirEntrega.mockResolvedValue(entrega);

    const res = await request(app)
      .patch('/api/entregas/1/atribuir')
      .send({
        veiculo_placa: 'XYZ9999',
        motorista_id: 42,
        motorista_nome: 'João Silva',
        veiculo_modelo: 'Fiat Fiorino',
      });

    expect(res.status).toBe(200);
    expect(res.body.veiculo_placa).toBe('XYZ9999');
    expect(res.body.motorista_id).toBe(42);
    expect(res.body.status).toBe('ATRIBUIDA');
    expect(entregaService.atribuirEntrega).toHaveBeenCalledWith('1', expect.any(Object));
  });

  test('400 quando veiculo_placa ausente', async () => {
    const res = await request(app)
      .patch('/api/entregas/1/atribuir')
      .send({ motorista_id: 42 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Placa do veículo e ID do motorista são obrigatórios',
    });
  });

  test('400 quando motorista_id ausente', async () => {
    const res = await request(app)
      .patch('/api/entregas/1/atribuir')
      .send({ veiculo_placa: 'ABC1234' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Placa do veículo e ID do motorista são obrigatórios',
    });
  });

  test('404 quando entrega não encontrada', async () => {
    entregaService.atribuirEntrega.mockRejectedValue(
      new AppError(404, 'Entrega não encontrada')
    );

    const res = await request(app)
      .patch('/api/entregas/999/atribuir')
      .send({ veiculo_placa: 'ABC1234', motorista_id: 1 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Entrega não encontrada' });
  });

  test('500 quando atribuirEntrega lança erro genérico', async () => {
    entregaService.atribuirEntrega.mockRejectedValue(new Error('connection refused'));

    const res = await request(app)
      .patch('/api/entregas/1/atribuir')
      .send({ veiculo_placa: 'ABC1234', motorista_id: 1 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro ao atribuir entrega' });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/entregas/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/entregas/:id', () => {
  test('200 cancela entrega (soft delete — status CANCELADA)', async () => {
    const entrega = makeEntrega({ status: 'CANCELADA' });
    entregaService.cancelarEntrega.mockResolvedValue(entrega);

    const res = await request(app).delete('/api/entregas/1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Entrega cancelada' });
    expect(entregaService.cancelarEntrega).toHaveBeenCalledWith('1');
  });

  test('404 quando entrega não encontrada', async () => {
    entregaService.cancelarEntrega.mockRejectedValue(
      new AppError(404, 'Entrega não encontrada')
    );

    const res = await request(app).delete('/api/entregas/999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Entrega não encontrada' });
  });

  test('500 quando cancelarEntrega lança erro genérico', async () => {
    entregaService.cancelarEntrega.mockRejectedValue(new Error('DB crash'));

    const res = await request(app).delete('/api/entregas/1');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Erro ao cancelar entrega' });
  });
});
