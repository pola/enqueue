'use strict';

const setupBoilerplate = require('./boilerplate/setup');
const config = require('./config');
const kth = require('./kth-data-fetcher');
const fetch = require('node-fetch');

const { app, io, sequelize,  listen } = setupBoilerplate();

app.use((req, res, next) => {
	if (!req.session.hasOwnProperty('cas_user') || req.session.hasOwnProperty('profile')) {
		next();
	} else {
		kth.from_id(req.session.cas_user).then(result => {
			if (result !== null) {
				finalize_login(req, res, result.id, result.user_name, result.name, next);
			} else {
				finalize_login(req, res, req.session.cas_user, null, null, next);
			}
		});
	}
});

const finalize_login = (req, res, id, user_name, name, next) => {
	model.get_or_create_profile(id, user_name, name).then(profile => {
		req.session.profile = profile;

		// när man är inloggad via REST, se till att eventuella (ska finnas!) websockets med samma cas_user också får sitt profilobjekt
		for (const k of Object.keys(io.sockets.sockets)) {
			const socket = io.sockets.sockets[k];
			const session = socket.handshake.session;

			if (session.hasOwnProperty('cas_user') && session.cas_user === profile.id) {
				session.profile = profile;
				socket.emit('profile', profile);
			}
		}

		next();
	});
};


// Bind REST controller to /api/*
const controller_rest = require('./controllers/rest.controller.js');
const controller_cas = require('./controllers/cas.controller.js');

app.use('/api', controller_rest);

app.use('/', controller_cas);

// Registers socket.io controller
const socketController = require('./controllers/socket.controller.js');
io.on('connection', socket => {
	socketController(socket, io);
});

// Demo calls to model
const model = require('./model.js');


var moment = require('moment');

model.setIo(io);
model.setConnection(sequelize);

listen(config.listen.port, config.listen.ip, () => {
	console.log("server listening on port", config.listen.port);
});
