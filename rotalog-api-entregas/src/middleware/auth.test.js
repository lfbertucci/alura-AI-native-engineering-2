const jwt = require('jsonwebtoken');
const authMiddleware = require('./auth');

const SECRET = 'test-secret';

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

test('500 quando JWT_SECRET ausente', () => {
  delete process.env.JWT_SECRET;
  const req = { headers: {} };
  const res = makeRes();
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'Erro de configuração de autenticação' });
  expect(next).not.toHaveBeenCalled();
});

test('401 quando sem header Authorization', () => {
  const req = { headers: {} };
  const res = makeRes();
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
});

test('401 quando header com uma só parte', () => {
  const req = { headers: { authorization: 'tokenapenas' } };
  const res = makeRes();
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ error: 'Token mal formatado' });
});

test('401 quando esquema não é Bearer', () => {
  const req = { headers: { authorization: 'Basic abc123' } };
  const res = makeRes();
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ error: 'Token mal formatado' });
});

test('401 quando token inválido (string lixo)', () => {
  const req = { headers: { authorization: 'Bearer lixolixolixo' } };
  const res = makeRes();
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
  expect(next).not.toHaveBeenCalled();
});

test('401 quando token expirado', () => {
  const token = jwt.sign({ sub: '1', nome: 'Ana', role: 'user' }, SECRET, { expiresIn: -10 });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = makeRes();
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
  expect(next).not.toHaveBeenCalled();
});

test('200 com token válido usando sub — popula req.user e chama next', () => {
  const payload = { sub: '42', nome: 'Ana', role: 'admin' };
  const token = jwt.sign(payload, SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = makeRes();
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(req.user).toMatchObject({ id: '42', nome: 'Ana', role: 'admin' });
});

test('200 com token válido usando id no lugar de sub', () => {
  const payload = { id: '99', nome: 'Bruno', role: 'user' };
  const token = jwt.sign(payload, SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = makeRes();
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(req.user).toMatchObject({ id: '99', nome: 'Bruno', role: 'user' });
});
