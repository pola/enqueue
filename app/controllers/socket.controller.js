const model = require('../model.js');

module.exports = (socket, io) =>
{
	socket.on('broadcast', data => {
		console.log(data);
		if (!('queue' in data) || !('message' in data)) {
			return;
		}
		
		if (typeof data.queue !== 'number' || typeof data.message !== 'string') {
			return;
		}
		
		if (!('profile' in socket.handshake.session)) {
			return;
		}
		
		model.get_queue(data.queue).then(queue => {
			if (queue === null) {
				return;
			}
			
			model.has_permission(queue, socket.handshake.session.profile.id).then(has_permission => {
				if (!has_permission) {
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
