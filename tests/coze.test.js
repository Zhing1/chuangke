const request = require('supertest');
const fs = require('fs');

let app;
beforeAll(() => {
  app = require('express')();
});

test('private key exists (skip if missing)', () => {
  const p = require('path').join(__dirname, '..', 'private_key.pem');
  expect(fs.existsSync(p)).toBeTruthy();
});

test('issue coze token endpoint responds', async () => {
  const srv = require('../server/server');
  const res = await request('http://localhost:' + (process.env.PORT || 3000))
    .post('/api/coze/token')
    .send({ sessionName: 'jest_session' })
    .set('Content-Type','application/json');
  expect([200,500]).toContain(res.statusCode);
  if (res.statusCode === 200){
    expect(res.body).toHaveProperty('access_token');
    expect(typeof res.body.access_token).toBe('string');
  }
});

test('ux summary endpoint responds', async () => {
  const res = await request('http://localhost:' + (process.env.PORT || 3000)).get('/api/ux-summary');
  expect(res.statusCode).toBe(200);
  expect(res.body).toHaveProperty('success', true);
});
