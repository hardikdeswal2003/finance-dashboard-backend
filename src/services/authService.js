const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

function register({ name, email, password, role = 'viewer' }) {
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, hash, role);
    return { id: result.lastInsertRowid, name, email, role };
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      const err = new Error('Email already exists');
      err.status = 409;
      throw err;
    }
    throw e;
  }
}

function login({ email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  if (user.status === 'inactive') {
    const err = new Error('Account is inactive');
    err.status = 403;
    throw err;
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

module.exports = { register, login };
