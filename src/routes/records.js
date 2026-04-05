const router = require('express').Router();
const { body, query, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const recordService = require('../services/recordService');

router.use(authenticate);

router.get('/',
  query('type').optional().isIn(['income', 'expense']),
  query('category').optional().trim(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { from, to } = req.query;
    if (from && to && from > to) {
      return res.status(400).json({ error: "'from' date must not be after 'to' date" });
    }

    try {
      res.json(recordService.listRecords(req.query));
    } catch (e) { next(e); }
  }
);

router.get('/:id', (req, res, next) => {
  try {
    res.json(recordService.getRecordById(req.params.id));
  } catch (e) { next(e); }
});

router.post('/',
  authorize('analyst', 'admin'),
  body('amount').isFloat({ gt: 0 }),
  body('type').isIn(['income', 'expense']),
  body('category').trim().notEmpty(),
  body('date').isISO8601(),
  body('notes').optional().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      res.status(201).json(recordService.createRecord(req.body, req.user.id));
    } catch (e) { next(e); }
  }
);

router.put('/:id',
  authorize('analyst', 'admin'),
  body('amount').optional().isFloat({ gt: 0 }),
  body('type').optional().isIn(['income', 'expense']),
  body('category').optional().trim().notEmpty(),
  body('date').optional().isISO8601(),
  body('notes').optional().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      res.json(recordService.updateRecord(req.params.id, req.body));
    } catch (e) { next(e); }
  }
);

router.delete('/:id', authorize('admin'), (req, res, next) => {
  try {
    recordService.softDeleteRecord(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
