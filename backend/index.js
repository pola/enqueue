'use strict'

const path = require('path')
const expressSession = require('express-session')
const sharedSession = require('express-socket.io-session')
const express = require('express')
const http = require('http')
const history = require('connect-history-api-fallback')
const Sequelize = require('sequelize')

const config = require('./config')
const kth = require('./kth-data-fetcher')
const model = require('./model')
const socket_controller = require('./socket_controller')

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

app.use((req, res, next) => {
	if (!req.session.hasOwnProperty('cas_user') || req.session.hasOwnProperty('profile')) {
		next()
	} else {
		kth.from_id(req.session.cas_user).then(result => {
			if (result !== null) {
				finalize_login(req, res, result.id, result.user_name, result.name, next)
			} else {
				finalize_login(req, res, req.session.cas_user, null, null, next)
			}
		})
	}
})

const finalize_login = (req, res, id, user_name, name, next) => {
	model.get_or_create_profile(id, user_name, name).then(profile => {
		req.session.profile = profile

		// när man är inloggad via REST, se till att eventuella (ska finnas!) websockets med samma cas_user också får sitt profilobjekt
		io.sockets.sockets.forEach(socket => {
			const session = socket.handshake.session

			if (session.hasOwnProperty('cas_user') && session.cas_user === profile.id) {
				session.profile = profile
				socket.emit('profile', profile)
			}
		})

		next()
	})
}

app.use('/api/authenticate', require('./api/authenticate'))
app.use('/api/colors', require('./api/colors'))
app.use('/api/me', require('./api/me'))
app.use('/api/queues', require('./api/queues'))
app.use('/api/rooms', require('./api/rooms'))
app.use('/api/teachers', require('./api/teachers'))
app.use('/', require('./api/cas'))

io.on('connection', socket => {
	console.log('socket connection!')
	socket_controller(socket, io)
})

model.setIo(io)
model.setConnection(sequelize)

httpServer.listen(config.listen.port, config.listen.ip)
