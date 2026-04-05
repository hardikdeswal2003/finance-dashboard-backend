const db = require('../db');

function getSummary() {
  const rows = db.prepare(
    'SELECT type, SUM(amount) as total FROM records WHERE deleted_at IS NULL GROUP BY type'
  ).all();
  const income   = rows.find(r => r.type === 'income')?.total  || 0;
  const expenses = rows.find(r => r.type === 'expense')?.total || 0;
  return { income, expenses, net_balance: income - expenses };
}

function getByCategory() {
  return db.prepare(
    `SELECT category, type, SUM(amount) as total, COUNT(*) as count
     FROM records WHERE deleted_at IS NULL
     GROUP BY category, type ORDER BY total DESC`
  ).all();
}

function getTrends(period = 'monthly') {
  const format = period === 'monthly' ? '%Y-%m' : '%Y-W%W';
  return db.prepare(
    `SELECT strftime(?, date) as period, type, SUM(amount) as total, COUNT(*) as count
     FROM records WHERE deleted_at IS NULL
     GROUP BY period, type ORDER BY period DESC LIMIT 24`
  ).all(format);
}

function getRecent() {
  return db.prepare(
    `SELECT r.id, r.amount, r.type, r.category, r.date, r.notes, u.name as created_by
     FROM records r JOIN users u ON r.created_by = u.id
     WHERE r.deleted_at IS NULL ORDER BY r.created_at DESC LIMIT 10`
  ).all();
}

module.exports = { getSummary, getByCategory, getTrends, getRecent };
