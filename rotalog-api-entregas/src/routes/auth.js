const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Credenciais fixas para ambiente de desenvolvimento (sem base de usuários)
const CREDENCIAIS = { username: 'admin', password: 'admin123' };

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== CREDENCIAIS.username || password !== CREDENCIAIS.password) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  const token = jwt.sign(
    { sub: '1', nome: 'Administrador', role: 'admin' },
    secret,
    { expiresIn: '8h' }
  );

  res.json({ token, expiresIn: '8h' });
});

module.exports = router;
