# ChatGram Backend

Backend API for a real-time chat application with authentication, user profiles, and messaging functionality.

## 🚀 Features

- **Authentication**: User registration and login with JWT tokens
- **User Profiles**: Manage user information and profiles
- **Real-time Chat**: Direct messaging between users with long-polling support
- **File Uploads**: Support for profile picture uploads
- **API Documentation**: Integrated Swagger/OpenAPI documentation
- **Serverless Deployment**: Optimized for Vercel serverless deployment

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **Swagger** - API documentation
- **Serverless HTTP** - Vercel deployment support

## 📋 Prerequisites

- Node.js 14+ installed
- PostgreSQL database
- Environment variables configured

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatgram-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   # Run the database schema setup
   node setup-db.js
   ```

5. **Start the server**
   ```bash
   npm start
   ```

The server will start on the default port (or as configured for your deployment).

## 📚 API Documentation

Once the server is running, you can access the interactive API documentation:

- **Swagger UI**: `http://localhost:3000/api-docs`
- **Swagger JSON**: `http://localhost:3000/api-docs-json`

## 🗂️ Project Structure

```
chatgram-backend/
├── config/
│   ├── db.js          # Database configuration
│   └── swagger.js     # Swagger documentation setup
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── chatController.js    # Chat functionality
│   └── userController.js    # User management
├── middleware/
│   ├── auth.js        # JWT authentication middleware
│   └── validate.js    # Request validation middleware
├── routes/
│   ├── auth.js        # Authentication routes
│   ├── chat.js        # Chat routes
│   └── users.js       # User routes
├── uploads/           # File upload directory
├── index.js           # Main application entry point
├── schema.sql         # Database schema
├── setup-db.js        # Database setup script
├── package.json       # Dependencies and scripts
└── vercel.json        # Vercel deployment configuration
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/upload` - Upload profile picture

### Chat
- `GET /api/chat/messages/:userId` - Get messages with specific user
- `POST /api/chat/send` - Send a message
- `GET /api/chat/conversations` - Get all conversations

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);
```

### Messages Table
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    from_user_id INT REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Deployment

### Vercel Deployment

The project is configured for serverless deployment on Vercel:

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Environment Variables**
   Make sure to set the following environment variables in your Vercel dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NODE_ENV`

### Local Development

For local development, you can run:

```bash
npm start
```

The server will start and serve the API with Swagger documentation available.

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Input validation with express-validator
- CORS protection
- Error handling with sanitized responses

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `NODE_ENV` | Environment (development/production) | No |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure your `DATABASE_URL` is correct
   - Check if PostgreSQL is running
   - Verify database credentials

2. **JWT Token Issues**
   - Ensure `JWT_SECRET` is set in environment variables
   - Check token expiration

3. **File Upload Issues**
   - Ensure `uploads` directory exists and has proper permissions
   - Check file size limits

## 📞 Support

For support and questions, please open an issue in the repository or contact the development team.

---

**Note**: This backend is designed to work with a frontend client application. Make sure to configure the CORS settings appropriately for your frontend domain.
