const setupBoilerplate = require('./boilerplate/setup');
const config = require('./config');

const { app, io, sequelize,  listen } = setupBoilerplate();

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

model.setIo(io);
model.setConnection(sequelize);

//model.connection = connection;

listen(config.port, '0.0.0.0', () => {
	console.log("server listening on port", config.port);
});
