const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('viewer', 'analyst', 'admin')) DEFAULT 'viewer',
    status TEXT NOT NULL CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL CHECK(amount > 0),
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    deleted_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

const JWT_SECRET = 'finance_secret_key';

function seedUser(role = 'viewer', status = 'active') {
  const hash = bcrypt.hashSync('password123', 1);
  const email = `${role}_${Date.now()}_${Math.random()}@test.com`;
  const result = db.prepare(
    'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)'
  ).run(`${role} user`, email, hash, role, status);
  const token = jwt.sign({ id: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '1h' });
  return { id: result.lastInsertRowid, email, token };
}

function seedRecord(userId, overrides = {}) {
  const r = { amount: 1000, type: 'income', category: 'salary', date: '2024-01-15', notes: 'test note', ...overrides };
  const result = db.prepare(
    'INSERT INTO records (amount, type, category, date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(r.amount, r.type, r.category, r.date, r.notes, userId);
  return result.lastInsertRowid;
}

module.exports = db;
module.exports.seedUser = seedUser;
module.exports.seedRecord = seedRecord;
