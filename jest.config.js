/**
 * Jest 配置文件
 */

module.exports = {
    // 测试环境
    testEnvironment: 'node',

    // 测试文件匹配模式
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js'
    ],

    // 忽略目录
    testPathIgnorePatterns: [
        '/node_modules/',
        '/data/'
    ],

    // 覆盖率配置
    collectCoverageFrom: [
        'services/**/*.js',
        'utils/**/*.js',
        'config/**/*.js',
        'models/**/*.js',
        '!**/node_modules/**'
    ],

    // 覆盖率报告目录
    coverageDirectory: 'coverage',

    // 覆盖率报告格式
    coverageReporters: ['text', 'lcov', 'html'],

    // 最小覆盖率要求（可选）
    // coverageThreshold: {
    //     global: {
    //         branches: 50,
    //         functions: 50,
    //         lines: 50,
    //         statements: 50
    //     }
    // },

    // 测试超时时间（毫秒）
    testTimeout: 30000,

    // 显示详细日志
    verbose: true,

    // 设置测试环境变量
    setupFiles: ['<rootDir>/tests/setup.js']
};
