const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

function authMiddleware(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET não configurado');
    return res.status(500).json({ error: 'Erro de configuração de autenticação' });
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Token mal formatado' });
  }

  const token = parts[1];
  try {
    const payload = jwt.verify(token, secret);
    req.user = {
      id: payload.sub || payload.id,
      nome: payload.nome,
      role: payload.role,
    };
    next();
  } catch (err) {
    logger.warn('Falha na verificação do token JWT', { erro: err.message });
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = authMiddleware;
