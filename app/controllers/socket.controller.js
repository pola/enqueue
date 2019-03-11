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
	
	socket.on('notify', data => {
		if (!('queue' in data) || !('message' in data) || !('recipient' in data)) {
			return;
		}
		
		if (typeof data.queue !== 'number' || typeof data.message !== 'string' || typeof data.recipient !== 'string') {
			return;
		}
		
		if (!('profile' in socket.handshake.session)) {
			return;
		}
		
		model.get_queue(data.queue).then(queue => {
			if (queue === null) {
				return;
			}
			
			const queuing_student = model.get_queuing(queue).find(x => x.profile.id === data.recipient);
			
			if (queuing_student === undefined) {
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
				
				for (const k of Object.keys(io.sockets.sockets)) {
					const socket = io.sockets.sockets[k];
					
					if ('profile' in socket.handshake.session && socket.handshake.session.profile.id === queuing_student.profile.id) {
						// TODO: skicka bara till den det berör, queuing_student.profile.id
						socket.emit('notify', {
							queue: queue.id,
							message: data.message,
							sender: profile
						});
					}
				}
			});
		});
	});
};
