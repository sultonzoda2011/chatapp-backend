const db = require('../config/db');

let pendingResponses = [];

const notifyPending = (msg) => {
    const toNotify = [...pendingResponses];
    pendingResponses = [];

    toNotify.forEach(p => {
        const isMatch = (p.currentUserId === msg.to_user_id && (p.otherUserId == msg.from_user_id || !p.otherUserId)) ||
            (p.currentUserId === msg.from_user_id && p.otherUserId == msg.to_user_id);

        if (isMatch && !p.res.headersSent) {
            p.res.json({
                status: 'success',
                message: 'New message received',
                data: [msg]
            });
        } else if (!isMatch) {
            pendingResponses.push(p);
        }
    });
};

exports.getMessages = async (req, res) => {
    const { since } = req.query;
    const { userId } = req.params;
    const currentUserId = req.user.id;

    try {
        let query = `
            SELECT id, from_user_id, to_user_id, content, timestamp as date 
            FROM messages 
            WHERE ((from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1))
        `;
        let params = [currentUserId, userId];

        if (since) {
            query += ' AND timestamp > $3';
            params.push(new Date(since));
        }

        query += ' ORDER BY timestamp ASC';
        const messages = await db.query(query, params);

        if (messages.rows.length > 0 || !since) {
            return res.json({
                status: 'success',
                message: 'Messages retrieved successfully',
                data: messages.rows
            });
        }

        const pendingResponse = { res, currentUserId, otherUserId: userId };
        pendingResponses.push(pendingResponse);

        setTimeout(() => {
            const index = pendingResponses.indexOf(pendingResponse);
            if (index !== -1) {
                pendingResponses.splice(index, 1);
                if (!res.headersSent) {
                    res.json({
                        status: 'success',
                        message: 'No new messages',
                        data: []
                    });
                }
            }
        }, 30000);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: 'Server error while fetching messages'
        });
    }
};

exports.sendMessage = async (req, res) => {
    const { content } = req.body;
    const { toUserId } = req.params;
    const fromUserId = req.user.id;

    try {
        const result = await db.query(
            'INSERT INTO messages (from_user_id, to_user_id, content) VALUES ($1, $2, $3) RETURNING id, from_user_id, to_user_id, content, timestamp as date',
            [fromUserId, toUserId, content]
        );
        const msg = result.rows[0];
        res.json({
            status: 'success',
            message: 'Message sent successfully',
            data: msg
        });
        notifyPending(msg);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: 'Server error while sending message'
        });
    }
};

exports.getChats = async (req, res) => {
    const currentUserId = req.user.id;
    try {
        const query = `
            SELECT * FROM (
                SELECT DISTINCT ON (u.id) 
                    u.id, u.username, u.fullname,
                    m.content as last_message,
                    m.timestamp as date
                FROM users u
                JOIN messages m ON (m.from_user_id = u.id AND m.to_user_id = $1) OR (m.from_user_id = $1 AND m.to_user_id = u.id)
                WHERE u.id != $1
                ORDER BY u.id, m.timestamp DESC
            ) as sub
            ORDER BY date DESC
        `;
        const chats = await db.query(query, [currentUserId]);
        res.json({
            status: 'success',
            message: 'Chats retrieved successfully',
            data: chats.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: 'Server error while fetching chats'
        });
    }
};

exports.deleteMessage = async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user.id;

    try {
        // Check if message exists and user is the sender
        const messageCheck = await db.query(
            'SELECT from_user_id FROM messages WHERE id = $1',
            [id]
        );

        if (messageCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Message not found'
            });
        }

        if (messageCheck.rows[0].from_user_id !== currentUserId) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Only the sender can delete this message'
            });
        }

        // Delete the message
        await db.query('DELETE FROM messages WHERE id = $1', [id]);

        res.status(200).json({
            status: 'success',
            message: 'Message deleted successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: 'Server error while deleting message'
        });
    }
};

exports.updateMessage = async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const currentUserId = req.user.id;

    try {
        // Check if message exists and user is the sender
        const messageCheck = await db.query(
            'SELECT from_user_id FROM messages WHERE id = $1',
            [id]
        );

        if (messageCheck.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Message not found'
            });
        }

        if (messageCheck.rows[0].from_user_id !== currentUserId) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Only the sender can edit this message'
            });
        }

        // Update the message content
        const result = await db.query(
            'UPDATE messages SET content = $1 WHERE id = $2 RETURNING id, from_user_id, to_user_id, content, timestamp as date',
            [content, id]
        );

        res.status(200).json({
            status: 'success',
            message: 'Message updated successfully',
            data: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            status: 'error',
            message: 'Server error while updating message'
        });
    }
};
