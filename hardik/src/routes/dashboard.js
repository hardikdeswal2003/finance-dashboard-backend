const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const dashboardService = require('../services/dashboardService');

router.use(authenticate);

router.get('/summary', (req, res, next) => {
  try {
    res.json(dashboardService.getSummary());
  } catch (e) { next(e); }
});

router.get('/by-category', (req, res, next) => {
  try {
    res.json(dashboardService.getByCategory());
  } catch (e) { next(e); }
});

router.get('/trends', (req, res, next) => {
  const { period = 'monthly' } = req.query;
  if (!['monthly', 'weekly'].includes(period)) {
    return res.status(400).json({ error: "period must be 'monthly' or 'weekly'" });
  }
  try {
    res.json(dashboardService.getTrends(period));
  } catch (e) { next(e); }
});

router.get('/recent', (req, res, next) => {
  try {
    res.json(dashboardService.getRecent());
  } catch (e) { next(e); }
});

module.exports = router;
