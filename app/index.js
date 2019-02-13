const setupBoilerplate = require('./boilerplate/setup');

const { app, io, sequelize,  listen } =  setupBoilerplate();
const port = 8989;

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

listen(port, () => {
	console.log("server listening on port", port);
});
