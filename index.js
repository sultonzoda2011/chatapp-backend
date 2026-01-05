const serverless = require('serverless-http')
const express = require('express')
const cors = require('cors')
const path = require('path')
const dotenv = require('dotenv')
const swaggerDocument = require('./config/swagger')

dotenv.config()

const app = express()

// Create uploads directory if it doesn't exist
const fs = require('fs')
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Middleware
app.use(cors())
app.use(express.json())

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Swagger UI custom HTML to avoid Vercel asset issues
const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Chat App. API Docs</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" >
    <style>
      html { box-sizing: border-box; overflow-y: scroll; }
      *, *:before, *:after { box-sizing: inherit; }
      body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/api-docs-json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      })
      window.ui = ui
    }
    </script>
</body>
</html>
`


app.get('/api-docs-json', (req, res) => {
  res.json(swaggerDocument)
})

app.get('/api-docs', (req, res) => {
  res.send(swaggerHtml)
})

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/users', require('./routes/users'))
app.use('/api/chat', require('./routes/chat'))

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// Export tho`Serverless handler
module.exports = app
module.exports.handler = serverless(app)
