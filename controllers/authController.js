const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../config/db')

// Auth logic
exports.register = async (req, res) => {
  const { username, fullname, email, password } = req.body
  try {
    const userExists = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [
      username,
      email,
    ])
    if (userExists.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists',
      })
    }

    const salt = await bcrypt.genSalt(10)
    const password_hash = await bcrypt.hash(password, salt)

    const newUser = await db.query(
      'INSERT INTO users (username, fullname, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, username',
      [username, fullname, email, password_hash],
    )

    const token = jwt.sign(
      { id: newUser.rows[0].id, username: newUser.rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    )

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: { token },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      status: 'error',
      message: 'Server error during registration',
    })
  }
}

exports.login = async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await db.query('SELECT * FROM users WHERE username = $1', [username])
    if (user.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid credentials',
      })
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash)
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid credentials',
      })
    }

    const token = jwt.sign(
      { id: user.rows[0].id, username: user.rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    )

    res.json({
      status: 'success',
      message: 'Login successful',
      data: { token },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      status: 'error',
      message: 'Server error during login',
    })
  }
}

// Profile logic
exports.getProfile = async (req, res) => {
  try {
    const user = await db.query(
      'SELECT id, username, fullname, email, avatar FROM users WHERE id = $1',
      [req.user.id],
    )
    if (user.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      })
    }
    res.json({
      status: 'success',
      message: 'Profile retrieved successfully',
      data: user.rows[0],
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching profile',
    })
  }
}

exports.updateProfile = async (req, res) => {
  const { username, fullname, email } = req.body
  const avatarPath = req.file ? `/uploads/${req.file.filename}` : null

  try {
    const fields = []
    const params = []
    let counter = 1

    if (username) {
      fields.push(`username = $${counter++}`)
      params.push(username)
    }
    if (fullname) {
      fields.push(`fullname = $${counter++}`)
      params.push(fullname)
    }
    if (email) {
      fields.push(`email = $${counter++}`)
      params.push(email)
    }
    if (avatarPath) {
      fields.push(`avatar = $${counter++}`)
      params.push(avatarPath)
    }

    if (fields.length === 0) {
      const user = await db.query(
        'SELECT id, username, fullname, email, avatar FROM users WHERE id = $1',
        [req.user.id],
      )
      return res.json({
        status: 'success',
        message: 'No changes provided',
        data: user.rows[0],
      })
    }

    params.push(req.user.id)
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${counter} RETURNING id, username, fullname, email, avatar`

    const updated = await db.query(query, params)
    
    if (updated.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      })
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: updated.rows[0],
    })
  } catch (err) {
    console.error('Update Profile Error:', err)
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating profile',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    })
  }
}

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      status: 'error',
      message: 'Passwords do not match',
    })
  }

  try {
    const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    const isMatch = await bcrypt.compare(oldPassword, user.rows[0].password_hash)
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Incorrect old password',
      })
    }

    const salt = await bcrypt.genSalt(10)
    const newHash = await bcrypt.hash(newPassword, salt)
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id])
    res.json({
      status: 'success',
      message: 'Password updated successfully',
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      status: 'error',
      message: 'Server error while changing password',
    })
  }
}
