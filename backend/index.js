'use strict'

const path = require('path')
const expressSession = require('express-session')
const sharedSession = require('express-socket.io-session')
const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const http = require('http')
const history = require('connect-history-api-fallback')
const Sequelize = require('sequelize')

const config = require('./config')
const model = require('./model')
const socket_controller = require('./socket_controller')
const { auth } = require('express-openid-connect')

const app = express()

const httpServer = http.Server(app)

const io = require('socket.io')(httpServer, {
	timeout: 5000,
	pingInterval: 5000,
	pingTimeout: 3000
})

const sequelize = new Sequelize(config.mysql.database, config.mysql.username, config.mysql.password, {
	host: config.mysql.host,
	dialect: 'mysql',
	supportBigNumbers: true,
	logging: config.debug ? console.log : false,
	
	pool: {
		max: 5,
		min: 0,
		acquire: 30000,
		idle: 10000
	},
	
	define: {
		timestamps: false
	}
})

app.use(express.json())

app.use(history({
	rewrites: [
		{
			from: /((^\/api\/.*$)|^\/login$|^\/logout$)/,
			to: (context) => {
				return context.parsedUrl.pathname
			}
		}
	]
}))

app.use(express.urlencoded({
	extended: true
}))

app.use(express.static(path.join(__dirname, '..', 'frontend')))

const session = expressSession({
	secret: 'hemligt',
	resave: true,
	saveUninitialized: true,
})

app.use(session)
io.use(sharedSession(session))

app.use(
	auth({
		authRequired: false,
    issuerBaseURL: 'https://login.ug.kth.se/adfs',
    baseURL: config.hostname,
    clientID: config.kthlogin.clientId,
    secret: config.kthlogin.clientSecret,
    idpLogout: true,
  })
)

app.use(async (req, res, next) => {
	if (req.oidc.user && !req.session.profile) {
		const id = req.oidc.user.kthid
		const username = req.oidc.user.username
		const name = req.oidc.user.unique_name[0]

		req.session.profile = await model.get_or_create_profile(id, username, name)
	}

	if (!req.oidc.user && req.session.profile && !req.session.apiAuthentication) {
		delete req.session.profile
	}

	next()
})

app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended : true }))

app.use('/api/authenticate', require('./api/authenticate'))
app.use('/api/colors', require('./api/colors'))
app.use('/api/me', require('./api/me'))
app.use('/api/queues', require('./api/queues'))
app.use('/api/rooms', require('./api/rooms'))
app.use('/api/teachers', require('./api/teachers'))

io.on('connection', socket => {
	socket_controller(socket, io)
})

model.setIo(io)
model.setConnection(sequelize)

httpServer.listen(config.listen.port, config.listen.ip)
