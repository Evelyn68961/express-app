const request = require('supertest');
const app = require('./app');

test('GET /dog returns woof', async () => {
  const res = await request(app).get('/dog');
  expect(res.statusCode).toBe(200);
  expect(res.text).toBe('woof');
});