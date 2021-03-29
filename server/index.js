require('dotenv').config()
const express = require('express')

const app = express()
const http = require('http').createServer(app)

const port = process.env.PORT || 5000
const path = require('path')

// Init sockets
require('./sockets/index').init(http, {}, port)

// Misc middleware
app.use(express.json()) // allows to read data from client (like body-parser)

// Serve client
const clientBuildPath = path.join(__dirname, '../client/build')
app.use(express.static(clientBuildPath))
app.get('/', (_req, res) => {
	res.sendFile(path.join(clientBuildPath, 'index.html'))
})
app.use('/static', express.static(path.join(__dirname, '/public')))

// Routes
app.use('/api/me', require('./routes/api/me'))
app.use('/api/users', require('./routes/api/users'))
app.use('/api/spaces', require('./routes/api/spaces'))
app.use('/api/objects', require('./routes/api/objects'))

// User facing API
app.use('/api/v1', require('./routes/api/v1/index'))

// Handles any api requests that are not defined
app.get('/api/*', (_req, res) =>
	res.status(404).send({ message: 'Endpoint not found' })
)

// Handles any requests that don't match the ones above
app.get('*', (_req, res) => {
	res.sendFile(path.join(clientBuildPath, 'index.html'))
})
http.listen(port, () => console.log(`Listening on port: ${port}`))
