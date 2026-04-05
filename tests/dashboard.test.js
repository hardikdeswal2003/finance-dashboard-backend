jest.mock('../src/db', () => require('./helpers'));
const request = require('supertest');
const app = require('../src/app');
const { seedUser, seedRecord } = require('./helpers');

let token;

beforeAll(() => {
  const admin = seedUser('admin');
  token = admin.token;
  seedRecord(admin.id, { amount: 5000, type: 'income', category: 'salary', date: '2024-01-15' });
  seedRecord(admin.id, { amount: 1200, type: 'expense', category: 'rent', date: '2024-01-20' });
  seedRecord(admin.id, { amount: 3000, type: 'income', category: 'freelance', date: '2024-02-10' });
});

const getAuth = () => ({ Authorization: `Bearer ${token}` });

describe('GET /api/dashboard/summary', () => {
  it('returns income, expenses, and net_balance', async () => {
    const res = await request(app).get('/api/dashboard/summary').set(getAuth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      income: expect.any(Number),
      expenses: expect.any(Number),
      net_balance: expect.any(Number)
    });
    expect(res.body.net_balance).toBe(res.body.income - res.body.expenses);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dashboard/by-category', () => {
  it('returns category-wise totals', async () => {
    const res = await request(app).get('/api/dashboard/by-category').set(getAuth());
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    res.body.forEach(row => {
      expect(row).toMatchObject({
        category: expect.any(String),
        type: expect.any(String),
        total: expect.any(Number),
        count: expect.any(Number)
      });
    });
  });
});

describe('GET /api/dashboard/trends', () => {
  it('returns monthly trends by default', async () => {
    const res = await request(app).get('/api/dashboard/trends').set(getAuth());
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    if (res.body.length > 0) {
      expect(res.body[0].period).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it('returns weekly trends', async () => {
    const res = await request(app).get('/api/dashboard/trends?period=weekly').set(getAuth());
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it('returns 400 for invalid period', async () => {
    const res = await request(app).get('/api/dashboard/trends?period=daily').set(getAuth());
    expect(res.status).toBe(400);
  });
});

describe('GET /api/dashboard/recent', () => {
  it('returns at most 10 recent transactions', async () => {
    const res = await request(app).get('/api/dashboard/recent').set(getAuth());
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeLessThanOrEqual(10);
    if (res.body.length > 0) {
      expect(res.body[0]).toMatchObject({
        id: expect.any(Number),
        amount: expect.any(Number),
        type: expect.any(String),
        category: expect.any(String)
      });
    }
  });
});
