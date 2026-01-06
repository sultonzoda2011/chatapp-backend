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

/**
 * @swagger
 * /api/chat/messages/{id}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Message deleted successfully
 *       403:
 *         description: Access denied - only sender can delete message
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.delete('/messages/:id', auth, [
    param('id', 'Valid Message ID is required').isInt()
], validate, chatController.deleteMessage);

/**
 * @swagger
 * /api/chat/messages/{id}:
 *   put:
 *     summary: Update a message content
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 description: New message content
 *                 example: Updated message text
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Message updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     from_user_id:
 *                       type: integer
 *                     to_user_id:
 *                       type: integer
 *                     content:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error - content cannot be empty
 *       403:
 *         description: Access denied - only sender can edit message
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.put('/messages/:id', auth, [
    param('id', 'Valid Message ID is required').isInt(),
    body('content', 'Message content is required and cannot be empty').not().isEmpty().trim()
], validate, chatController.updateMessage);

module.exports = router
