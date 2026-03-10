// slot.routes.js
const express = require('express');
const slotRouter = express.Router();
const { getSlots } = require('../controllers/slot.controller');
const { authenticate, requireRole } = require('../middlewares/auth.middleware');

slotRouter.use(authenticate);
slotRouter.get('/', requireRole(['super_admin', 'receptionist']), getSlots);

module.exports = slotRouter;
