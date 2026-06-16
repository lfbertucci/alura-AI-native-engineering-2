'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const validar = require('../middleware/validar');
const {
  criarEntregaSchema,
  atualizarEntregaSchema,
  atribuirEntregaSchema,
  atualizarStatusSchema,
} = require('../schemas/entregaSchemas');
const entregaService = require('../services/entregaService');
const { AppError } = require('../services/entregaService');

// ---------------------------------------------------------------------------
// Helper de tratamento de erros
// ---------------------------------------------------------------------------

function tratarErro(res, err, msgGenerica) {
  if (err instanceof AppError) {
    const body = { error: err.publicMessage };
    if (err.extra) {
      Object.assign(body, err.extra);
    }
    return res.status(err.status).json(body);
  }
  logger.error(msgGenerica, { message: err.message });
  return res.status(500).json({ error: msgGenerica });
}

// ---------------------------------------------------------------------------
// GET /api/entregas
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const entregas = await entregaService.listarEntregas(req.query);
    res.json(entregas);
  } catch (err) {
    tratarErro(res, err, 'Erro interno do servidor');
  }
});

// ---------------------------------------------------------------------------
// GET /api/entregas/stats
// ---------------------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const stats = await entregaService.obterEstatisticas();
    res.json(stats);
  } catch (err) {
    tratarErro(res, err, 'Erro ao buscar estatísticas');
  }
});

// ---------------------------------------------------------------------------
// GET /api/entregas/pedido/:numeroPedido
// ---------------------------------------------------------------------------
router.get('/pedido/:numeroPedido', async (req, res) => {
  try {
    const entrega = await entregaService.buscarPorPedido(req.params.numeroPedido);
    res.json(entrega);
  } catch (err) {
    tratarErro(res, err, 'Erro interno do servidor');
  }
});

// ---------------------------------------------------------------------------
// GET /api/entregas/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const entrega = await entregaService.buscarPorId(req.params.id);
    res.json(entrega);
  } catch (err) {
    tratarErro(res, err, 'Erro interno do servidor');
  }
});

// ---------------------------------------------------------------------------
// POST /api/entregas
// ---------------------------------------------------------------------------
router.post('/', validar(criarEntregaSchema), async (req, res) => {
  try {
    const entrega = await entregaService.criarEntrega(req.body);
    res.status(201).json(entrega);
  } catch (err) {
    tratarErro(res, err, 'Erro ao criar entrega');
  }
});

// ---------------------------------------------------------------------------
// PUT /api/entregas/:id
// ---------------------------------------------------------------------------
router.put('/:id', validar(atualizarEntregaSchema), async (req, res) => {
  try {
    const entrega = await entregaService.atualizarEntrega(req.params.id, req.body);
    res.json(entrega);
  } catch (err) {
    tratarErro(res, err, 'Erro ao atualizar entrega');
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/entregas/:id/status
// ---------------------------------------------------------------------------
router.patch('/:id/status', validar(atualizarStatusSchema), async (req, res) => {
  try {
    const entrega = await entregaService.atualizarStatus(req.params.id, req.body.status);
    res.json(entrega);
  } catch (err) {
    tratarErro(res, err, 'Erro ao atualizar status');
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/entregas/:id/atribuir
// ---------------------------------------------------------------------------
router.patch('/:id/atribuir', validar(atribuirEntregaSchema), async (req, res) => {
  try {
    const entrega = await entregaService.atribuirEntrega(req.params.id, req.body);
    res.json(entrega);
  } catch (err) {
    tratarErro(res, err, 'Erro ao atribuir entrega');
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/entregas/:id
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const entrega = await entregaService.cancelarEntrega(req.params.id);
    res.json({ message: 'Entrega cancelada', entrega });
  } catch (err) {
    tratarErro(res, err, 'Erro ao cancelar entrega');
  }
});

module.exports = router;
