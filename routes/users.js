const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

const { query } = require('express-validator');
const validate = require('../middleware/validate');

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search for users
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of users }
 */
router.get('/search', auth, [
    query('q', 'Search query is required').not().isEmpty()
], validate, userController.searchUsers);

module.exports = router;
