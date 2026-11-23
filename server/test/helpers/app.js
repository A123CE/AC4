const request = require('supertest');
const app = require('../../src/app');

/**
 * 测试不启动真实端口，直接复用导出的 Express app。
 * 生产/开发入口为 server/src/server.js。
 */
function getApp() {
  return app;
}

module.exports = { app, request, getApp };