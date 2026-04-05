const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');

router.post('/register',
  body('name').trim().notEmpty().isLength({ min: 1 }),
  body('email').isEmail().normalizeEmail(),
  body('password').trim().isLength({ min: 6 }),
  body('role').optional().isIn(['viewer', 'analyst', 'admin']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      res.status(201).json(authService.register(req.body));
    } catch (e) {
      next(e);
    }
  }
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      res.json(authService.login(req.body));
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
