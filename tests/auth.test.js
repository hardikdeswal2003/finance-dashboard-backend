jest.mock('../src/db', () => require('./helpers'));
const request = require('supertest');
const app = require('../src/app');

describe('POST /api/auth/register', () => {
  it('creates a user and returns 201', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice', email: 'alice@test.com', password: 'secret123', role: 'viewer'
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Alice', email: 'alice@test.com', role: 'viewer' });
    expect(res.body.password).toBeUndefined();
  });

  it('defaults role to viewer when not provided', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bob', email: 'bob@test.com', password: 'secret123'
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('viewer');
  });

  it('returns 409 on duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Carol', email: 'carol@test.com', password: 'secret123'
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Carol2', email: 'carol@test.com', password: 'secret123'
    });
    expect(res.status).toBe(409);
  });

  it('returns 400 on missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 400 on invalid role', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dave', email: 'dave@test.com', password: 'secret123', role: 'superuser'
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Eve', email: 'eve@test.com', password: 'secret123', role: 'analyst'
    });
  });

  it('returns token and user on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'eve@test.com', password: 'secret123'
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: 'eve@test.com', role: 'analyst' });
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'eve@test.com', password: 'wrongpass'
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com', password: 'secret123'
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for inactive user', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Inactive', email: 'inactive@test.com', password: 'secret123'
    });
    const db = require('./helpers');
    db.prepare("UPDATE users SET status = 'inactive' WHERE email = ?").run('inactive@test.com');
    const res = await request(app).post('/api/auth/login').send({
      email: 'inactive@test.com', password: 'secret123'
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 on whitespace-only password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Frank', email: 'frank@test.com', password: '      '
    });
    expect(res.status).toBe(400);
  });
});
