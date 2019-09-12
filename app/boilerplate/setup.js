'use strict';

require('better-logging')(console);

const path = require('path');
const expressSession = require('express-session');
const sharedSession = require('express-socket.io-session');
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const history = require('connect-history-api-fallback');
const Sequelize = require('sequelize');

const config = require('../config');

/**
 * This function sets up some boilerplate for express and socket.io
 * - Creates express app
 * - Creates socket.io app
 * - Logs all incoming requests
 * - Serves static files from ../public/* at /
 * - Parses request-body & request-url
 * - Adds a cookie based session storage to both express & socket.io
*/
module.exports = () => {
	const app = express(); // Creates express app
	
	var httpServer;
	
	if (config.ssl.key !== null && config.ssl.cert !== null) {
		httpServer = https.createServer({
			key: fs.readFileSync(config.ssl.key),
			cert: fs.readFileSync(config.ssl.cert)
		}, app);
	} else {
		httpServer = http.Server(app);
	}
	
	const io = require('socket.io')(httpServer, {
		timeout: 5000,
		pingInterval: 5000,
		pingTimeout: 3000
	});

	// ORM (Sequelize)
	const sequelize = new Sequelize(config.mysql.database, config.mysql.username, config.mysql.password, {
		host: config.mysql.host,
		dialect: 'mysql',
		logging: config.debug,
		
		pool: {
			max: 5,
			min: 0,
			acquire: 30000,
			idle: 10000
		},
		
		define: {
			timestamps: false
		}
	});

	// Setup express
	app.use((req, res, next) => {
		// Logs each incoming request
		console.info(`${console.color.Dark_Gray} ${req.ip} ${console.color.RESET} ${req.path} ${req.body || ''}`);
		next();
	});

	/*
		This is a middleware, provided by express, that parses the body of the request into a javascript object.
		It's basically just replacing the body property like this:
		req.body = JSON.parse(req.body)
	*/
	app.use(express.json());

	app.use(history({
		rewrites: [
			{
				from: /((^\/api\/.*$)|^\/login$|^\/logout$)/,
				to: (context) => {
					return context.parsedUrl.pathname;
				}
			}
		]
	}));

	app.use(express.urlencoded({
		extended: true
	}));

	// This will serve static files from the public directory, starting with index.html
	app.use(express.static(path.join(__dirname, '..', '..', 'public')));

	// Setup session
	const session = expressSession({
		secret: 'hemligt',
		resave: true,
		saveUninitialized: true,
	});

	app.use(session);
	io.use(sharedSession(session));

	return {
		app, io, sequelize,
		listen: (port, cb) => httpServer.listen(port, cb)
	}
}
