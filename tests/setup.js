/**
 * Jest 测试环境设置
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/private_wind_test';
process.env.AI_API_KEY = 'test-api-key';
process.env.FEISHU_WEBHOOK = 'https://test-webhook.example.com';

// 禁用 console.log 避免干扰测试输出（可选）
// console.log = jest.fn();
