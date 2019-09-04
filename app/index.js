'use strict';

const setupBoilerplate = require('./boilerplate/setup');
const config = require('./config');
const fetch = require('node-fetch');

const { app, io, sequelize,  listen } = setupBoilerplate();

app.use((req, res, next) => {
	if (!req.session.hasOwnProperty('cas_user') || req.session.hasOwnProperty('profile')) {
		next();
	} else {
		fetch('https://hodis.datasektionen.se/ugkthid/' + req.session.cas_user).then(result => {
			if (result.status === 200) {
				result.json().then(data => {
					if (data.hasOwnProperty('uid') && data.hasOwnProperty('displayName') && typeof data.uid === 'string' && typeof data.displayName === 'string') {
						finalize_login(req, res, req.session.cas_user, data.uid, data.displayName, next);
					} else {
						finalize_login(req, res, req.session.cas_user, null, null, next);
					}
				});
			} else {
				finalize_login(req, res, req.session.cas_user, null, null, next);
			}
		});
	}
});

const finalize_login = (req, res, id, user_name, name, next) => {
	model.get_or_create_profile(id, user_name, name).then(profile => {
		req.session.profile = profile;
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

listen(config.port, config.listen.ip, () => {
	console.log("server listening on port", config.listen.port);
});
