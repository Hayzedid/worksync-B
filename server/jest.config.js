export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  moduleFileExtensions: ['js', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  verbose: true,
  collectCoverage: false, // Can be enabled with --coverage flag
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/test/**',
    '!src/config/setupDatabase.js',
    '!src/config/initDatabase.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/test/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  setupFiles: ['<rootDir>/test/setup.js']
};
