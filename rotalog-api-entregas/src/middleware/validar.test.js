'use strict';

/**
 * Testes unitários para src/middleware/validar.js
 */

const { z } = require('zod');
const validar = require('./validar');

// Schema de exemplo para os testes
const schemaExemplo = z.object({
  nome: z.string({ required_error: 'Nome é obrigatório' }).min(1, 'Nome é obrigatório'),
  idade: z.number().optional(),
});

function makeReqRes(body = {}) {
  const req = { body };
  const res = {
    statusCode: null,
    responseBody: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.responseBody = body;
      return this;
    },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('validar(schema)', () => {
  test('schema válido: chama next() e normaliza req.body', () => {
    const { req, res, next } = makeReqRes({ nome: 'João', idade: 30 });

    validar(schemaExemplo)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ nome: 'João', idade: 30 });
    expect(res.statusCode).toBeNull();
  });

  test('schema válido: campos opcionais ausentes não geram erro', () => {
    const { req, res, next } = makeReqRes({ nome: 'Maria' });

    validar(schemaExemplo)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  test('schema inválido: responde 400 com a primeira mensagem de erro', () => {
    const { req, res, next } = makeReqRes({ idade: 25 }); // nome ausente

    validar(schemaExemplo)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.responseBody).toEqual({ error: 'Nome é obrigatório' });
  });

  test('schema inválido: body vazio retorna 400', () => {
    const { req, res, next } = makeReqRes({});

    validar(schemaExemplo)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.responseBody.error).toBeDefined();
  });

  test('schema inválido: tipo errado retorna 400', () => {
    const { req, res, next } = makeReqRes({ nome: 'João', idade: 'nao-e-numero' });

    validar(schemaExemplo)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.responseBody.error).toBeDefined();
  });

  test('req.body é substituído pelos dados parseados pelo Zod', () => {
    // Zod strip: campos extras são removidos
    const { req, res, next } = makeReqRes({ nome: 'Ana', campoExtra: 'ignorar' });

    validar(schemaExemplo)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).not.toHaveProperty('campoExtra');
  });
});
