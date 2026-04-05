const db = require('../db');

function listUsers() {
  return db.prepare('SELECT id, name, email, role, status, created_at FROM users').all();
}

function getUserById(id) {
  const user = db.prepare('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?').get(id);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return user;
}

function updateUser(id, { name, role, status }) {
  getUserById(id); // throws 404 if not found

  const fields = [];
  const values = [];
  if (name)   { fields.push('name = ?');   values.push(name); }
  if (role)   { fields.push('role = ?');   values.push(role); }
  if (status) { fields.push('status = ?'); values.push(status); }

  if (!fields.length) {
    const err = new Error('No fields to update');
    err.status = 400;
    throw err;
  }

  values.push(id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(id);
}

function deleteUser(id, requestingUserId) {
  if (parseInt(id) === requestingUserId) {
    const err = new Error('Cannot delete your own account');
    err.status = 400;
    throw err;
  }
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (!result.changes) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
}

module.exports = { listUsers, getUserById, updateUser, deleteUser };
