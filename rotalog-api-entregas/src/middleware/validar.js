'use strict';

/**
 * Middleware genérico de validação com Zod.
 * Faz safeParse do body contra o schema fornecido.
 * Em falha: responde 400 com a primeira mensagem de erro.
 * Em sucesso: normaliza req.body com os dados parseados e chama next().
 */
function validar(schema) {
  return function (req, res, next) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const primeiroErro = result.error.errors[0].message;
      return res.status(400).json({ error: primeiroErro });
    }
    req.body = result.data;
    return next();
  };
}

module.exports = validar;
