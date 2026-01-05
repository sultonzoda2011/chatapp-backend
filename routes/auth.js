const express = require('express')
const router = express.Router()
const { check } = require('express-validator')
const validate = require('../middleware/validate')
const auth = require('../middleware/auth')
const authController = require('../controllers/authController')
const multer = require('multer')
const path = require('path')

// Multer config for avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
    if (mimetype && extname) return cb(null, true)
    cb(new Error('File upload only supports jpeg, jpg, png'))
  },
})

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, fullname, email, password]
 *             properties:
 *               username: { type: string }
 *               fullname: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Success }
 *       400: { description: Error }
 */
router.post(
  '/register',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('fullname', 'Fullname is required').not().isEmpty(),
    check('email', 'Valid email required').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ],
  validate,
  authController.register,
)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Success }
 *       400: { description: Error }
 */
router.post(
  '/login',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('password', 'Password is required').not().isEmpty(),
  ],
  validate,
  authController.login,
)

// Profile routes (merged into auth)

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current profile
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Success }
 */
router.get('/profile', auth, authController.getProfile)

/**
 * @swagger
 * /api/auth/profile/update:
 *   post:
 *     summary: Update profile
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               fullname: { type: string }
 *               email: { type: string }
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200: { description: Success }
 */
router.post(
  '/profile/update',
  auth,
  upload.single('avatar'),
  [
    check('username', 'Username cannot be empty').optional().not().isEmpty(),
    check('fullname', 'Fullname cannot be empty').optional().not().isEmpty(),
    check('email', 'Invalid email format').optional().isEmail(),
  ],
  validate,
  authController.updateProfile,
)

/**
 * @swagger
 * /api/auth/profile/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword, confirmPassword]
 *             properties:
 *               oldPassword: { type: string }
 *               newPassword: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: Success }
 */
router.post(
  '/profile/change-password',
  auth,
  [
    check('oldPassword', 'Old password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
    check('confirmPassword', 'Confirm password is required').not().isEmpty(),
  ],
  validate,
  authController.changePassword,
)

module.exports = router
