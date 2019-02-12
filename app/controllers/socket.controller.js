const model = require('../model.js');

module.exports = (socket, io) =>
{
	socket.on('lock', id => {
		model.lock_time_slot(id);
		io.sockets.emit('lock', id);
	});
	
	socket.on('unlock', id => {
		model.unlock_time_slot(id);
		io.sockets.emit('unlock', id);
	});
	
	socket.on('book', data => {
		var id = data.id;
		var name = data.name;
		
		model.book_time_slot(id, name);
		io.sockets.emit('book', {id, name});
	});
	
	socket.on('remove', id => {
		model.remove_time_slot(id);
		
		io.sockets.emit('refresh', null);
	});
	
	socket.on('create', data => {
		model.create_time_slot(data.id, data.time);
		
		io.sockets.emit('refresh', null);
	});
};
