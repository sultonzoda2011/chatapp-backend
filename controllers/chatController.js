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
                    u.id, u.username, u.fullname, u.avatar,
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
