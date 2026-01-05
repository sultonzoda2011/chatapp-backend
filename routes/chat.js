const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const chatController = require('../controllers/chatController')

const { param, body } = require('express-validator');
const validate = require('../middleware/validate');

/**
 * @swagger
 * /api/chat/messages/{userId}:
 *   get:
 *     summary: Get chat messages with a specific user (long-polling)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get('/messages/:userId', auth, [
    param('userId', 'Valid User ID is required').isInt()
], validate, chatController.getMessages);

/**
 * @swagger
 * /api/chat/send/{toUserId}:
 *   post:
 *     summary: Send a message to a specific user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: toUserId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent
 */
router.post('/send/:toUserId', auth, [
    param('toUserId', 'Valid Recipient User ID is required').isInt(),
    body('content', 'Message content is required').not().isEmpty()
], validate, chatController.sendMessage);

/**
 * @swagger
 * /api/chat/chats:
 *   get:
 *     summary: Get list of active chats
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of chats
 */
router.get('/chats', auth, chatController.getChats)

module.exports = router
