module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/middleware/auth.js',
    'src/middleware/validar.js',
    'src/routes/entregas.js',
    'src/services/entregaService.js',
    'src/schemas/entregaSchemas.js',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  clearMocks: true,
};
