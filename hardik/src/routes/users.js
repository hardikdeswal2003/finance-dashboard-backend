const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const userService = require('../services/userService');

router.use(authenticate, authorize('admin'));

router.get('/', (req, res, next) => {
  try {
    res.json(userService.listUsers());
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    res.json(userService.getUserById(req.params.id));
  } catch (e) { next(e); }
});

router.patch('/:id',
  body('role').optional().isIn(['viewer', 'analyst', 'admin']),
  body('status').optional().isIn(['active', 'inactive']),
  body('name').optional().trim().notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      res.json(userService.updateUser(req.params.id, req.body));
    } catch (e) { next(e); }
  }
);

router.delete('/:id', (req, res, next) => {
  try {
    userService.deleteUser(req.params.id, req.user.id);
    res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
