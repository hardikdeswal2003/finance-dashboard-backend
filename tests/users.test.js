jest.mock('../src/db', () => require('./helpers'));
const request = require('supertest');
const app = require('../src/app');
const { seedUser } = require('./helpers');

let admin, viewer;

beforeAll(() => {
  admin  = seedUser('admin');
  viewer = seedUser('viewer');
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('GET /api/users', () => {
  it('admin can list users', async () => {
    const res = await request(app).get('/api/users').set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0]).not.toHaveProperty('password');
  });

  it('viewer cannot list users (403)', async () => {
    const res = await request(app).get('/api/users').set(auth(viewer.token));
    expect(res.status).toBe(403);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/:id', () => {
  it('admin can get a user by id', async () => {
    const res = await request(app).get(`/api/users/${viewer.id}`).set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(viewer.id);
    expect(res.body).not.toHaveProperty('password');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/users/99999').set(auth(admin.token));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/users/:id', () => {
  it('admin can update a user role', async () => {
    const target = seedUser('viewer');
    const res = await request(app)
      .patch(`/api/users/${target.id}`)
      .set(auth(admin.token))
      .send({ role: 'analyst' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('analyst');
  });

  it('admin can deactivate a user', async () => {
    const target = seedUser('viewer');
    const res = await request(app)
      .patch(`/api/users/${target.id}`)
      .set(auth(admin.token))
      .send({ status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('inactive');
  });

  it('returns 400 on invalid role value', async () => {
    const res = await request(app)
      .patch(`/api/users/${viewer.id}`)
      .set(auth(admin.token))
      .send({ role: 'superadmin' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no fields provided', async () => {
    const res = await request(app)
      .patch(`/api/users/${viewer.id}`)
      .set(auth(admin.token))
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown user', async () => {
    const res = await request(app)
      .patch('/api/users/99999')
      .set(auth(admin.token))
      .send({ role: 'analyst' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/users/:id', () => {
  it('admin can delete another user', async () => {
    const target = seedUser('viewer');
    const res = await request(app).delete(`/api/users/${target.id}`).set(auth(admin.token));
    expect(res.status).toBe(204);
  });

  it('admin cannot delete their own account', async () => {
    const res = await request(app).delete(`/api/users/${admin.id}`).set(auth(admin.token));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own account/i);
  });

  it('returns 404 for already deleted user', async () => {
    const target = seedUser('viewer');
    await request(app).delete(`/api/users/${target.id}`).set(auth(admin.token));
    const res = await request(app).delete(`/api/users/${target.id}`).set(auth(admin.token));
    expect(res.status).toBe(404);
  });

  it('viewer cannot delete users (403)', async () => {
    const res = await request(app).delete(`/api/users/${admin.id}`).set(auth(viewer.token));
    expect(res.status).toBe(403);
  });
});
