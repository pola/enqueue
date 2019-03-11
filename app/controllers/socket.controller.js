const model = require('../model.js');

module.exports = (socket, io) =>
{
	socket.on('broadcast', data => {
		console.log(data);
		if (!('queue' in data) || !('message' in data)) {
			socket.emit('broadcast_status', {
				success: false,
				queue: null,
				error: 'INVALID_PARAMETERS',
				message: 'Invalid or missing parameters.'
			});
			return;
		}
		
		if (typeof data.queue !== 'number' || typeof data.message !== 'string') {
			socket.emit('broadcast_status', {
				success: false,
				queue: null,
				error: 'INVALID_PARAMETERS',
				message: 'Invalid or missing parameters.'
			});
			return;
		}
		
		if (!('profile' in socket.handshake.session)) {
			socket.emit('broadcast_status', {
				success: false,
				queue: null,
				error: 'PERMISSION_DENIED',
				message: 'You do not have permission to sent notifications.'
			});
			return;
		}
		
		model.get_queue(data.queue).then(queue => {
			if (queue === null) {
				socket.emit('notify_status', {
					success: false,
					queue: null,
					error: 'UNKNOWN_QUEUE',
					message: 'The specified queue was not found.'
				});
				return;
			}
			
			model.has_permission(queue, socket.handshake.session.profile.id).then(has_permission => {
				if (!has_permission) {
					socket.emit('broadcast_status', {
						success: false,
						queue: queue.id,
						error: 'PERMISSION_DENIED',
						message: 'You do not have permission to sent notifications.'
					});
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
				
				socket.emit('broadcast_status', {
					success: true,
					queue: queue.id,
					message: data.message
				});
			});
		});
	});
	
	socket.on('notify', data => {
		if (!('queue' in data) || !('message' in data) || !('recipient' in data)) {
			socket.emit('notify_status', {
				success: false,
				queue: null,
				error: 'INVALID_PARAMETERS',
				message: 'Invalid or missing parameters.'
			});
			return;
		}
		
		if (typeof data.queue !== 'number' || typeof data.message !== 'string' || typeof data.recipient !== 'string') {
			socket.emit('notify_status', {
				success: false,
				queue: null,
				error: 'INVALID_PARAMETERS',
				message: 'Invalid or missing parameters.'
			});
			return;
		}
		
		if (!('profile' in socket.handshake.session)) {
			socket.emit('notify_status', {
				success: false,
				queue: null,
				error: 'PERMISSION_DENIED',
				message: 'You do not have permission to sent notifications.'
			});
			return;
		}
		
		model.get_queue(data.queue).then(queue => {
			if (queue === null) {
				socket.emit('notify_status', {
					success: false,
					queue: null,
					error: 'UNKNOWN_QUEUE',
					message: 'The specified queue was not found.'
				});
				return;
			}
			
			const queuing_student = model.get_queuing(queue).find(x => x.profile.id === data.recipient);
			
			if (queuing_student === undefined) {
				socket.emit('notify_status', {
					success: false,
					queue: queue.id,
					error: 'UNKNOWN_QUEING_STUDENT',
					message: 'The specified student is not in the queue.'
				});
				return;
			}
			
			model.has_permission(queue, socket.handshake.session.profile.id).then(has_permission => {
				if (!has_permission) {
					socket.emit('notify_status', {
						success: false,
						queue: queue.id,
						error: 'PERMISSION_DENIED',
						message: 'You do not have permission to sent notifications.'
					});
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
						socket.emit('notify', {
							queue: queue.id,
							message: data.message,
							sender: profile
						});
					}
				}
				
				socket.emit('notify_status', {
					success: true,
					queue: queue.id,
					recipient: queuing_student,
					message: data.message
				});
			});
		});
	});
};
