module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  // Solo medir cobertura de los archivos de pruebas unitarias (mocks)
  collectCoverageFrom: [
    'test/**/*.js'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ]
};
