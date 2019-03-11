const model = require('../model.js');

module.exports = (socket, io) =>
{
	socket.on('broadcast', data => {
		console.log(data);
		if (!('queue' in data) || !('message' in data) || typeof data.queue !== 'number' || typeof data.message !== 'string') {
			console.log('1');
			return;
		}
		
		if (!('profile' in socket.handshake.session)) {
			console.log('2');
			return;
		}
		
		model.get_queue(data.queue).then(queue => {
			if (queue === null) {
				console.log('3');
				return;
			}
			
			model.has_permission(queue, socket.handshake.session.profile.id).then(has_permission => {
				if (!has_permission) {
					console.log('4');
					return;
				}
				
				const profile = {
					id: socket.handshake.session.profile.id,
					user_name: socket.handshake.session.profile.user_name,
					name: socket.handshake.session.profile.name
				};
				
				io.emit('broadcast', {
					queue: queue.id,
					message: data.message,
					sender: profile
				});
			});
		});
	});
};
