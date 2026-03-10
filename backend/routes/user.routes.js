const express = require('express');
const router = express.Router();
const { getUsers, createReceptionist, toggleUserActive } = require('../controllers/user.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

router.use(authenticate);
router.use(requireRole(['super_admin']));

router.get('/', getUsers);
router.post('/receptionist', createReceptionist);
router.patch('/:id/toggle-active', toggleUserActive);

module.exports = router;
