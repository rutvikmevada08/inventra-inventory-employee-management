const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_inventory_test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.LOGIN_RATE_LIMIT = '1000';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-uploads-'));

const mongoose = require('mongoose');
const request = require('supertest');
const env = require('../config/env');
const app = require('../app');
const { connectDb } = require('../config/db');
const User = require('../models/User');

async function setup() {
  await connectDb();
  await mongoose.connection.dropDatabase();
  // Unique and sparse indexes must exist before the tests rely on them.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

async function teardown() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  fs.rmSync(env.uploadDir, { recursive: true, force: true });
}

async function makeUser(overrides = {}) {
  const user = new User({ name: 'Test User', email: `u${Date.now()}${Math.random().toString(16).slice(2)}@example.com`, role: 'staff', ...overrides });
  await user.setPassword(overrides.password || 'password123');
  await user.save();
  return user;
}

async function login(user, password = 'password123') {
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password });
  return res.body.data?.token;
}

// Returns small helpers bound to one token: api.get('/x'), api.post('/x', body)
const as = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url, body) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body),
  put: (url, body) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body),
  del: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  raw: (method, url) => request(app)[method](url).set('Authorization', `Bearer ${token}`),
});

module.exports = { app, request, setup, teardown, makeUser, login, as, env };
