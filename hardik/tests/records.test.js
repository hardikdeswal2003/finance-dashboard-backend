jest.mock('../src/db', () => require('./helpers'));
const request = require('supertest');
const app = require('../src/app');
const { seedUser, seedRecord } = require('./helpers');

let admin, analyst, viewer, recordId;

beforeAll(() => {
  admin = seedUser('admin');
  analyst = seedUser('analyst');
  viewer = seedUser('viewer');
  recordId = seedRecord(admin.id, { notes: 'monthly salary payment', category: 'salary' });
  seedRecord(admin.id, { type: 'expense', category: 'rent', amount: 500, notes: 'office rent' });
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('GET /api/records', () => {
  it('viewer can list records', async () => {
    const res = await request(app).get('/api/records').set(auth(viewer.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body).toMatchObject({ total: expect.any(Number), page: 1, limit: 20 });
  });

  it('filters by type', async () => {
    const res = await request(app).get('/api/records?type=expense').set(auth(viewer.token));
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.type).toBe('expense'));
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/records?category=salary').set(auth(viewer.token));
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.category).toBe('salary'));
  });

  it('searches by notes keyword', async () => {
    const res = await request(app).get('/api/records?search=salary').set(auth(viewer.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(r =>
      expect(r.notes?.toLowerCase() + r.category.toLowerCase()).toMatch(/salary/)
    );
  });

  it('searches by category keyword', async () => {
    const res = await request(app).get('/api/records?search=rent').set(auth(viewer.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });

  it('returns 400 when from is after to', async () => {
    const res = await request(app)
      .get('/api/records?from=2024-06-01&to=2024-01-01')
      .set(auth(viewer.token));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/from/);
  });

  it('paginates correctly', async () => {
    const res = await request(app).get('/api/records?page=1&limit=1').set(auth(viewer.token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.limit).toBe(1);
  });
});

describe('GET /api/records/:id', () => {
  it('returns a single record', async () => {
    const res = await request(app).get(`/api/records/${recordId}`).set(auth(viewer.token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(recordId);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/records/99999').set(auth(viewer.token));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/records', () => {
  it('analyst can create a record', async () => {
    const res = await request(app).post('/api/records').set(auth(analyst.token)).send({
      amount: 2000, type: 'income', category: 'freelance', date: '2024-02-01', notes: 'project payment'
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ amount: 2000, type: 'income', category: 'freelance' });
  });

  it('admin can create a record', async () => {
    const res = await request(app).post('/api/records').set(auth(admin.token)).send({
      amount: 300, type: 'expense', category: 'utilities', date: '2024-02-05'
    });
    expect(res.status).toBe(201);
  });

  it('viewer cannot create a record (403)', async () => {
    const res = await request(app).post('/api/records').set(auth(viewer.token)).send({
      amount: 100, type: 'income', category: 'other', date: '2024-02-01'
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 on invalid amount', async () => {
    const res = await request(app).post('/api/records').set(auth(analyst.token)).send({
      amount: -50, type: 'income', category: 'other', date: '2024-02-01'
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 on missing required fields', async () => {
    const res = await request(app).post('/api/records').set(auth(analyst.token)).send({ amount: 100 });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/records/:id', () => {
  it('analyst can update a record', async () => {
    const res = await request(app).put(`/api/records/${recordId}`).set(auth(analyst.token)).send({
      amount: 1500, notes: 'updated note'
    });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(1500);
  });

  it('viewer cannot update a record (403)', async () => {
    const res = await request(app).put(`/api/records/${recordId}`).set(auth(viewer.token)).send({ amount: 999 });
    expect(res.status).toBe(403);
  });

  it('returns 400 when no fields provided', async () => {
    const res = await request(app).put(`/api/records/${recordId}`).set(auth(analyst.token)).send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/records/:id (soft delete)', () => {
  it('analyst cannot delete a record (403)', async () => {
    const res = await request(app).delete(`/api/records/${recordId}`).set(auth(analyst.token));
    expect(res.status).toBe(403);
  });

  it('admin can soft-delete a record', async () => {
    const id = seedRecord(admin.id);
    const res = await request(app).delete(`/api/records/${id}`).set(auth(admin.token));
    expect(res.status).toBe(204);
  });

  it('soft-deleted record is excluded from listing', async () => {
    const id = seedRecord(admin.id, { category: 'todelete' });
    await request(app).delete(`/api/records/${id}`).set(auth(admin.token));
    const res = await request(app).get(`/api/records/${id}`).set(auth(viewer.token));
    expect(res.status).toBe(404);
  });
});
