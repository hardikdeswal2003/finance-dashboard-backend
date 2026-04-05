const db = require('../db');

function listRecords({ type, category, from, to, search, page = 1, limit = 20 }) {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (type)     { conditions.push('type = ?');                          params.push(type); }
  if (category) { conditions.push('category = ?');                      params.push(category); }
  if (from)     { conditions.push('date >= ?');                         params.push(from); }
  if (to)       { conditions.push('date <= ?');                         params.push(to); }
  if (search)   { conditions.push('(notes LIKE ? OR category LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const where  = conditions.join(' AND ');
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as count FROM records WHERE ${where}`).get(...params).count;
  const data  = db.prepare(
    `SELECT r.*, u.name as created_by_name FROM records r
     JOIN users u ON r.created_by = u.id
     WHERE ${where} ORDER BY r.date DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  return { data, total, page: parseInt(page), limit: parseInt(limit) };
}

function getRecordById(id) {
  const record = db.prepare(
    `SELECT r.*, u.name as created_by_name FROM records r
     JOIN users u ON r.created_by = u.id
     WHERE r.id = ? AND r.deleted_at IS NULL`
  ).get(id);
  if (!record) {
    const err = new Error('Record not found');
    err.status = 404;
    throw err;
  }
  return record;
}

function createRecord({ amount, type, category, date, notes }, userId) {
  const result = db.prepare(
    'INSERT INTO records (amount, type, category, date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(amount, type, category, date, notes || null, userId);
  return db.prepare('SELECT * FROM records WHERE id = ?').get(result.lastInsertRowid);
}

function updateRecord(id, { amount, type, category, date, notes }) {
  getRecordById(id); // throws 404 if not found or soft-deleted

  const fields = [];
  const values = [];
  if (amount !== undefined) { fields.push('amount = ?');   values.push(amount); }
  if (type)                 { fields.push('type = ?');     values.push(type); }
  if (category)             { fields.push('category = ?'); values.push(category); }
  if (date)                 { fields.push('date = ?');     values.push(date); }
  if (notes !== undefined)  { fields.push('notes = ?');    values.push(notes); }

  if (!fields.length) {
    const err = new Error('No fields to update');
    err.status = 400;
    throw err;
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE records SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM records WHERE id = ?').get(id);
}

function softDeleteRecord(id) {
  const record = db.prepare('SELECT id FROM records WHERE id = ? AND deleted_at IS NULL').get(id);
  if (!record) {
    const err = new Error('Record not found');
    err.status = 404;
    throw err;
  }
  db.prepare("UPDATE records SET deleted_at = datetime('now') WHERE id = ?").run(id);
}

module.exports = { listRecords, getRecordById, createRecord, updateRecord, softDeleteRecord };
