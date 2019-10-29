'use strict';

const model = require("../model.js");
const express = require('express');
const config = require('../config');
const router = express.Router();

const is_kthlan = ip => {
	const split_ip = ip => {
		const ip_parts = ip.split('.');
		return (parseInt(ip_parts[0]) * Math.pow(2, 24)) + (parseInt(ip_parts[1]) * Math.pow(2, 16)) + (parseInt(ip_parts[2]) * Math.pow(2, 8)) + parseInt(ip_parts[3]);
	};
	
	const ip_int = split_ip(ip);

	for (const network of config.kthlan) {
		const split = network.split('/');
		const net_bit_count = parseInt(split[1]);

		var net_int = split_ip(split[0]) & (~(Math.pow(2, net_bit_count) - 1) & 0xffffffff);
		
		if ((net_int & ip_int) === net_int) {
			return true;
		}
	}

	return false;
};

// hämta profilen för den inloggade användaren
router.get('/me', (req, res) => {
	model.get_computer(req.connection.remoteAddress).then(location => {
		if (req.session.hasOwnProperty('profile')) {
			model.get_profile(req.session.profile.id).then(profile => {
				profile.getAssistantInQueues().then(queues => {
					res.json({
						profile: profile,
						assisting_in: queues.map(q => ({
							id: q.id,
							name: q.name
						})),
						location: location,
						is_kthlan: is_kthlan(req.connection.remoteAddress)
					});
				});
			});
		} else {
			res.json({
				profile: null,
				assisting_in: [],
				location: location,
				is_kthlan: is_kthlan(req.connection.remoteAddress)
			});
		}
	});
});

// logga in en användare eller ge användaren en nyckel
router.get('/authenticate', (req, res) => {
	if (req.header('Token') !== undefined) {
		model.validate_token(req.header('Token')).then(result => {
			if (result === null) {
				res.json({
					authenticated: false,
					token: null
				});
			} else {
				req.session.profile = result.profile;
				
				res.json({
					authenticated: true,
					token: result.token
				});
			}
		});
	} else if (req.session.hasOwnProperty('profile')) {
		model.create_token(req.session.profile.id).then(token => {
			res.json({
				authenticated: true,
				token: token.token
			});
		})
	} else {
		res.json({
			authenticated: false,
			token: null
		});
	}
});

// hämta alla rum
router.get('/rooms', (req, res) => {
	model.get_rooms().then(rooms => {
		res.json(rooms);
	});
});

// hämta alla färger som actions kan ha
router.get('/colors', (req, res) => {
	res.json(model.colors);
});

// hämta alla lärarprofiler
router.get('/admin/teachers', (req, res) => {
	if (!req.session.hasOwnProperty('profile') || !req.session.profile.teacher) {
		res.status(401);
		res.json([]);
		return;
	}

	model.get_teachers().then(teachers => {
		res.json(teachers);
	});
});

// lägg till en profil som lärare
router.post('/admin/teachers', (req, res) => {
	if (!req.session.hasOwnProperty('profile') || !req.session.profile.teacher) {
		res.status(401);
		res.end();
		return;
	}

	model.get_profile_by_user_name(req.body.user_name).then(profile => {
		if (profile === null) {
			res.status(400);
			res.json({
				error: 'UNKNOWN_USER',
				message: 'No user with the given user name exists.'
			});
			return;
		}

		if (profile.teacher) {
			res.status(400);
			res.json({
				error: 'ALREADY_TEACHER',
				message: 'The user is already a teacher.'
			});
			return;
		}

		model.add_teacher(profile);
	});
});

// ta bort en profil som lärare
router.delete('/admin/teachers/:id', (req, res) => {
	if (!req.session.hasOwnProperty('profile') || !req.session.profile.teacher) {
		res.status(401);
		res.end();
		return;
	}

	model.get_profile(req.params.id).then(profile => {
		if (profile === null || !profile.teacher) {
			res.status(404);
			res.end();
			return;
		}

		// man kan inte ta bort sig själv som lärare
		if (profile.id === req.session.profile.id) {
			res.status(401);
			res.end();
			return;
		}

		model.remove_teacher(profile);
	});
});

// ge (grundläggande) information om alla köer
router.get('/queues', (req, res) => {
	model.get_queues().then(queues => {
		res.json(queues.map(queue => ({
			id: queue.id,
			name: queue.name,
			open: queue.open,
			queuing_count: model.get_queuing(queue).length
		})));
	});
});

// skapa en ny kö
router.post('/queues', (req, res) => {
	if (!req.session.hasOwnProperty('profile') || !req.session.profile.teacher) {
		res.status(401);
		res.end();
		return;
	}

	if (!valid_queue_name(req.body.name)) {
		res.status(400);
		res.json({
			error: 'INVALID_NAME',
			message: 'The name is invalid.'
		});
		return;
	}

	model.get_or_create_queue(req.body.name).then(queue => {
		res.status(201);
		res.json(queue);
	});
});

// ge information om en kö
router.get('/queues/:name', (req, res) => {
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		model.get_bookings(queue).then(bookings => {
			model.get_actions(queue).then(actions => {
				model.has_permission(queue, req.session.hasOwnProperty('profile') ? req.session.profile.id : null).then(has_permission => {
					if (!has_permission) {
						queue.Students = queue.Students.map(s => {
							if (req.session.hasOwnProperty('profile') && req.session.profile.id === s.id) {
								return s;
							} else {
								return null;
							}
						});
					}
					
					var queuing = model.get_queuing(queue);
					
					if (!req.session.hasOwnProperty('profile')) {
						queuing = queuing.map(s => {
							const s_copy = Object.assign({}, s);
							
							s_copy.profile = {
								id: s.profile.id,
								user_name: null,
								name: null
							};
							
							return s_copy;
						});
					}
					
					res.json({
						id: queue.id,
						name: queue.name,
						description: queue.description,
						open: queue.open,
						force_kthlan: queue.force_kthlan,
						force_comment: queue.force_comment,
						force_action: queue.force_action,
						queuing: queuing,
						actions: actions.map(a => ({
							id: a.id,
							name: a.name,
							color: a.color
						})),
						rooms: queue.Rooms.map(r => ({
							id: r.id,
							name: r.name
						})),
						students: queue.Students.map(s => s === null ? null : {
							id: s.id,
							user_name: s.user_name,
							name: s.name
						}),
						assistants: queue.Assistants.map(a => ({
							id: a.id,
							user_name: a.user_name,
							name: a.name
						})),
						bookings: bookings.map(b => nice_booking(b))
					});
				});
			});
		});
	});
});

// radera en kö
router.delete('/queues/:name', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}

	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		if (!req.session.profile.teacher) {
			res.status(401);
			res.end();
			return;
		}

		model.delete_queue(queue).then(() => {
			res.status(200);
			res.end();
		});
	});
});

// ny student i kön
router.post('/queues/:name/queuing', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}

	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		if (!req.body.hasOwnProperty('comment') || !req.body.hasOwnProperty('action') || !req.body.hasOwnProperty('location')) {
			res.status(400);
			res.json({
				error: 'MISSING_PARAMETER',
				message: 'Missing comment, action or location.'
			});
			return;
		}

		if ((req.body.comment !== null && typeof(req.body.comment) !== 'string') || (req.body.action !== null && typeof(req.body.action) !== 'number') || (req.body.location !== null && typeof(req.body.location) !== 'string')) {
			res.status(400);
			res.json({
				error: 'INVALID_PARAMETER_TYPE',
				message: 'Invalid comment, action or location.'
			});
			return;
		}

		if (req.body.comment !== null && req.body.comment.length === 0) {
			req.body.comment = null;
		}

		if (req.body.comment === null && queue.force_comment) {
			res.status(400);
			res.json({
				error: 'COMMENT_REQUIRED',
				message: 'A comment is required.'
			});
			return;
		}

		if (req.body.action === null && queue.force_action) {
			res.status(400);
			res.json({
				error: 'ACTION_REQUIRED',
				message: 'An action is required.'
			});
			return;
		}

		model.get_computer(req.connection.remoteAddress).then(computer => {
			// blir antingen en sträng eller en datorplats ({id: ..., name: ...})
			var location;

			// klienten sitter vid en identifierad dator
			if (computer !== null) {
				// men är datorn i listan på godkända rum?
				if (queue.Rooms.length !== 0) {
					var room_ok = false;

					for (const room of queue.Rooms) {
						if (room.id === computer.room_id) {
							room_ok = true;
							break;
						}
					}

					if (!room_ok) {
						res.status(400);
						res.json({
							error: 'INVALID_ROOM',
							message: 'Invalid room.'
						});
						return;
					}
				}

				// datorn är i listan på godkända rum, eller så är listan tom och alla rum är godkända
				location = {
					id: computer.id,
					name: computer.name
				};
			} else if (req.body.location === null || req.body.location.length === 0) {
				res.status(400);
				res.json({
					error: 'LOCATION_REQUIRED',
					message: 'A location is required.'
				});
				return;
			} else {
				// om man måste sitta i ett särskilt rum måste man sitta vid en identifierad dator
				if (queue.Rooms.length !== 0) {
					res.status(400);
					res.json({
						error: 'SPECIFIC_ROOM_REQUIRED',
						message: 'You must sit in one of the specified rooms.'
					});
					return;
				}
				
				location = req.body.location;
			}

			// om man har en fritextplacering kan det ibland vara så att man behöver sitta på KTHLAN
			if (typeof location === 'string' && queue.force_kthlan && !is_kthlan(req.connection.remoteAddress)) {
				res.status(400);
				res.json({
					error: 'NO_KTHLAN',
					message: 'You must be connected to KTHLAN.'
				});
				return;
			}
			
			model.get_action_by_id(req.body.action).then(action => {
				if (req.body.action !== null) {
					if (action === null || action.queue_id !== queue.id) {
						res.status(400);
						res.json({
							error: 'INVALID_ACTION',
							message: 'Unknown action.'
						});
						return;
					}
					
					// action-objektet kommer direkt från databasen, så vi tar endast med den data som vi behöver
					action = {
						id: action.id,
						name: action.name,
						color: action.color
					};
				}
				
				if (!queue.open) {
					res.status(400);
					res.json({
						error: 'QUEUE_IS_CLOSED',
						message: 'The queue is not open.'
					});
					return;
				}
				
				// man kan inte gå in i en kö som man redan står i (då får man PUT:a med ny data)
				for (const student of model.get_queuing(queue)) {
					if (student.profile.id === req.session.profile.id) {
						res.status(400);
						res.json({
							error: 'ALREADY_IN_QUEUE',
							message: 'You are already standing in the queue.'
						});
						return;
					}
				}
				
				const profile = {
					id: req.session.profile.id,
					user_name: req.session.profile.user_name,
					name: req.session.profile.name
				};
				
				model.add_student(queue, profile, req.body.comment, location, action);
				
				res.status(201);
				res.end();
				return;
			});
		});
	});
});

// töm kön som assistent
router.delete('/queues/:name/queuing', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}

	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (!has_permission) {
				res.status(401);
				res.end();
				return;
			}

			model.get_queuing(queue).length = 0;

			res.status(200);
			res.end();

			model.io_emit_update_queuing(queue);
		});
	});
});

// lämna kön (om det är en själv) eller sparka ut någon (som assistent)
router.delete('/queues/:name/queuing/:id', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}

	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		var found = false;
		const queuing = model.get_queuing(queue);

		for (var i = 0; i < queuing.length; i++) {
			if (queuing[i].profile.id === req.params.id) {
				found = true;

				model.has_permission(queue, req.session.profile.id).then(has_permission => {
					if (queuing[i].profile.id !== req.session.profile.id && !has_permission) {
						res.status(401);
						res.end();
						return;
					}

					queuing.splice(i, 1);

					res.status(200);
					res.end();

					model.io_emit_update_queuing(queue);
				});

				break;
			}
		}

		if (!found) {
			res.status(404);
			res.end();
			return;
		}
	});
});

// ändra en kö
router.patch('/queues/:name', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}

	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (!has_permission) {
				res.status(401);
				res.end();
				return;
			}

			update_queue(queue, {}, req, res, Object.keys(req.body));
		});
	});
});

const update_queue = (queue, changes, req, res, keys) => {
	if (keys.length === 0) {
		const changes_keys = Object.keys(changes);

		if (changes_keys.length === 0) {
			res.status(400);
			res.json({
				error: 'NOTHING_TO_CHANGE',
				message: 'Specify at least one parameter to change.'
			});
			return;
		}

		// spara ändringarna
		for (const changes_key of changes_keys) {
			queue[changes_key] = changes[changes_key];
		}

		queue.save().then(() => {
			res.status(200);
			res.end();
			
			model.io_emit_update_queue(queue, changes);
		});
	} else {
		const key = keys[0];

		if (key === 'name' && typeof req.body.name === 'string') {
			keys.shift();

			if (!valid_queue_name(req.body.name)) {
				res.status(400);
				res.json({
					error: 'INVALID_NAME',
					message: 'The name is invalid.'
				});
				return;
			}

			model.get_queue(req.body.name).then(existing_queue => {
				if (existing_queue !== null && existing_queue.id !== queue.id) {
					res.status(400);
					res.json({
						error: 'NAME_IS_TAKEN',
						message: 'The name is already used by another queue.'
					});
					return;
				}

				changes.name = req.body.name;

				update_queue(queue, changes, req, res, keys);
			});
		} else if (key === 'description' && (req.body.description === null || typeof req.body.description === 'string')) {
			keys.shift();

			changes.description = req.body.description;

			if (changes.description !== null && changes.description.length === 0) {
				changes.description = null;
			}

			update_queue(queue, changes, req, res, keys);
		} else if (key === 'open' && typeof req.body.open === 'boolean') {
			keys.shift();

			changes.open = req.body.open;

			update_queue(queue, changes, req, res, keys);
		} else if (key === 'force_kthlan' && typeof req.body.force_kthlan === 'boolean') {
			keys.shift();

			changes.force_kthlan = req.body.force_kthlan;

			update_queue(queue, changes, req, res, keys);
		} else if (key === 'force_comment' && typeof req.body.force_comment === 'boolean') {
			keys.shift();

			changes.force_comment = req.body.force_comment;

			update_queue(queue, changes, req, res, keys);
		} else if (key === 'force_action' && typeof req.body.force_action === 'boolean') {
			keys.shift();

			changes.force_action = req.body.force_action;

			update_queue(queue, changes, req, res, keys);
		} else {
			res.status(400);
			res.json({
				error: 'UNKNOWN_PARAMETER',
				message: 'An unknown parameter or an invalid value was specified.'
			});
		}
	}
};

// ändra en student i kön
router.patch('/queues/:name/queuing/:id', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}

	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		// hitta vilken student i kön det berör
		var student = null;

		for (const s of model.get_queuing(queue)) {
			if (s.profile.id === req.params.id) {
				student = s;
				break;
			}
		}

		if (student === null) {
			res.status(404);
			res.end();
			return;
		}

		update_student(queue, student, {}, req, res, Object.keys(req.body));
	});
});

const update_student = (queue, student, changes, req, res, keys) => {
	if (keys.length === 0) {
		const changes_keys = Object.keys(changes);

		if (changes_keys.length === 0) {
			res.status(400);
			res.json({
				error: 'NOTHING_TO_CHANGE',
				message: 'Specify at least one parameter to change.'
			});
			return;
		}

		// spara ändringarna
		var update_entire_queue = false;
		
		for (const changes_key of changes_keys) {
			if (changes_key === 'move_after') {
				model.move_student_after(queue, student, changes.move_after);
				update_entire_queue = true;
			} else if (changes_key === 'handlers') {
				if (changes[changes_key].is_handling) {
					student.handlers.push(changes[changes_key].profile);
				} else {
					for (var i = 0; i < student.handlers.length; i++) {
						if (student.handlers[i].id === changes[changes_key].profile.id) {
							student.handlers.splice(i, 1);
							break;
						}
					}
				}
			} else {
				student[changes_key] = changes[changes_key];
			}
		}

		res.status(200);
		res.end();

		if (update_entire_queue) {
			model.io_emit_update_queuing(queue);
		} else {
			model.io_emit_update_queue_queuing_student(queue, student);
		}
	} else {
		const key = keys[0];

		if ((key === 'location' && (req.body.location === null || typeof req.body.location === 'string'))
			|| (key === 'comment' && (req.body.comment === null || typeof req.body.comment === 'string'))
			|| (key === 'action' && (req.body.action === null || typeof req.body.action === 'number'))) {
			if (student.profile.id !== req.session.profile.id) {
				res.status(401);
				res.end();
				return;
			}

			if (key === 'location') {
				keys.shift();

				model.get_computer(req.connection.remoteAddress).then(computer => {
					// blir antingen en sträng eller en datorplats ({id: ..., name: ...})
					var location;

					// klienten sitter vid en identifierad dator
					if (computer !== null) {
						// men är datorn i listan på godkända rum?
						if (queue.Rooms.length !== 0) {
							var room_ok = false;

							for (const room of queue.Rooms) {
								if (room.id === computer.room_id) {
									room_ok = true;
									break;
								}
							}

							if (!room_ok) {
								res.status(400);
								res.json({
									error: 'INVALID_ROOM',
									message: 'Invalid room.'
								});
								return;
							}
						}

						// datorn är i listan på godkända rum, eller så är listan tom och alla rum är godkända
						changes.location = {
							id: computer.id,
							name: computer.name
						};
					} else if (req.body.location === null || req.body.location.length === 0) {
						res.status(400);
						res.json({
							error: 'LOCATION_REUQIRED',
							message: 'A location is required.'
						});
						return;
					} else {
						// om man måste sitta i ett särskilt rum måste man sitta vid en identifierad dator
						if (queue.Rooms.length !== 0) {
							res.status(400);
							res.json({
								error: 'SPECIFIC_ROOM_REQUIRED',
								message: 'You must sit in one of the specified rooms.'
							});
							return;
						}

						changes.location = req.body.location;
					}

					// om man har en fritextplacering kan det ibland vara så att man behöver sitta på KTHLAN
					if (typeof location === 'string' && queue.force_kthlan && !is_kthlan(req.connection.remoteAddress)) {
						res.status(400);
						res.json({
							error: 'NO_KTHLAN',
							message: 'You must be connected to KTHLAN.'
						});
						return;
					}
					
					if (student.bad_location) {
						changes.bad_location = false;
					}
					
					update_student(queue, student, changes, req, res, keys);
				});
			}

			if (key === 'comment') {
				keys.shift();

				if (req.body.comment !== null && req.body.comment.length === 0) {
					req.body.comment = null;
				}

				if (req.body.comment === null && queue.force_comment) {
					res.status(400);
					res.json({
						error: 'COMMENT_REQUIRED',
						message: 'A comment is required.'
					});
					return;
				}

				changes.comment = req.body.comment;

				update_student(queue, student, changes, req, res, keys);
			}

			if (key === 'action') {
				keys.shift();

				if (req.body.action === null) {
					if (queue.force_action) {
						res.status(400);
						res.json({
							error: 'ACTION_REQUIRED',
							message: 'An action is required.'
						});
						return;
					}

					changes.action = null;

					update_student(queue, student, changes, req, res, keys);
				} else {
					model.get_action_by_id(req.body.action).then(action => {
						if (action === null || action.queue_id !== queue.id) {
							res.status(400);
							res.json({
								error: 'INVALID_ACTION',
								message: 'Unknown action.'
							});
							return;
						}

						// action-objektet kommer direkt från databasen, så vi tar endast med den data som vi behöver
						changes.action = {
							id: action.id,
							name: action.name,
							color: action.color
						};

						update_student(queue, student, changes, req, res, keys);
					});
				}
			}
		} else if (key === 'move_after' && (typeof req.body.move_after === 'string' || req.body.move_after === null)) {
			keys.shift();

			model.has_permission(queue, req.session.profile.id).then(has_permission => {
				if (!has_permission) {
					res.status(401);
					res.end();
					return;
				}

				if (req.body.move_after !== null) {
					var found = null;

					for (const s of model.get_queuing(queue)) {
						if (s.profile.id === req.body.move_after) {
							found = true;
							break;
						}
					}

					if (!found) {
						res.status(400);
						res.json({
							error: 'INVALID_MOVE_AFTER_STUDENT',
							message: 'Cannot find the student specified in parameter move_after.'
						});
						return;
					}
				}

				changes.move_after = req.body.move_after;
				update_student(queue, student, changes, req, res, keys);
			});
		} else if (key === 'bad_location' && typeof req.body.bad_location === 'boolean') {
			keys.shift();

			model.has_permission(queue, req.session.profile.id).then(has_permission => {
				if (!has_permission) {
					res.status(401);
					res.end();
					return;
				}
				
				changes.bad_location = req.body.bad_location;
				update_student(queue, student, changes, req, res, keys);
			});
		} else if (key === 'is_handling' && typeof req.body.is_handling === 'boolean') {
			keys.shift();

			model.has_permission(queue, req.session.profile.id).then(has_permission => {
				if (!has_permission) {
					res.status(401);
					res.end();
					return;
				}
				
				var currently_handling = false;
				
				for (const handler of student.handlers) {
					if (handler.id === req.session.profile.id) {
						currently_handling = true;
						break;
					}
				}
				
				if (currently_handling && req.body.is_handling) {
					res.status(400);
					res.json({
						error: 'ALREADY_HANDLING',
						message: 'You are already handling the specified student.'
					});
					return;
				}
				
				if (!currently_handling && !req.body.is_handling) {
					res.status(400);
					res.json({
						error: 'NOT_HELPING',
						message: 'You are not handling the specified student.'
					});
					return;
				}
				
				changes.handlers = {
					profile: {
						id: req.session.profile.id,
						user_name: req.session.profile.user_name,
						name: req.session.profile.name
					},
					is_handling: req.body.is_handling
				};
				
				update_student(queue, student, changes, req, res, keys);
			});
		} else {
			res.status(400);
			res.json({
				error: 'UNKNOWN_PARAMETER',
				message: 'An unknown parameter or an invalid value was specified.'
			});
			return;
		}
	}
};

// ge information om actions för en kö
router.get('/queues/:name/actions', (req, res) => {
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		model.get_actions(queue).then(actions => {
			res.json(actions.map(a => ({
				id: a.id,
				name: a.name,
				color: a.color
			})));
		});
	});
});

// lägg till en ny action
router.post('/queues/:name/actions', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}

	if (!req.body.hasOwnProperty('name') || typeof req.body.name !== 'string' || !req.body.hasOwnProperty('color') || model.colors.indexOf(req.body.color) === -1) {
		res.status(400);
		res.json({
			error: 'INVALID_PARAMETER',
			message: 'Missing or invalid name or color parameters.'
		});
		return;
	}

	if (req.body.name.length === 0) {
		res.status(400);
		res.json({
			error: 'NAME_IS_EMPTY',
			message: 'The name cannot be empty.'
		});
		return;
	}

	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (!has_permission) {
				res.status(401);
				res.end();
				return;
			}

			model.get_action_by_name(queue, req.body.name).then(existing_action => {
				if (existing_action !== null) {
					res.status(400);
					res.json({
						error: 'NAME_IN_TAKEN',
						message: 'The name is already in use.'
					});
					return;
				}

				model.create_action(queue, req.body.name, req.body.color).then(action => {
					res.status(201);
					res.end();
				});
			});
		});
	});
});

// ta bort en action
router.delete('/queues/:name/actions/:id', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}

	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		model.get_action_by_id(req.params.id).then(action => {
			if (action === null || action.queue_id !== queue.id) {
				res.status(404);
				res.end();
				return;
			}

			model.delete_action(queue, action).then(() => {
				res.status(200);
				res.end();
			});
		});
	});
});

// ge information om rum för en kö
router.get('/queues/:name/rooms', (req, res) => {
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		res.json(queue.Rooms.map(r => ({
			id: r.id,
			name: r.name
		})));
	});
});

// associera ett rum med en kö
router.post('/queues/:name/rooms', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		if (!req.body.hasOwnProperty('room_id') || typeof req.body.room_id !== 'number') {
			res.status(400);
			res.json({
				error: 'INVALID_PARAMETER_ROOM_ID',
				message: 'Missing or invalid id parameter.'
			});
			return;
		}
		
		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (!has_permission) {
				res.status(401);
				res.end();
				return;
			}
		
			model.get_room(req.body.room_id).then(room => {
				if (room === null) {
					res.status(400);
					res.json({
						error: 'UNKNOWN_ROOM',
						message: 'No room with the given ID exists.'
					});
					return;
				}
			
				model.add_room_to_queue(room, queue).then(was_added => {
					if (!was_added) {
						res.status(400);
						res.json({
							error: 'ALREADY_ASSOCIATED',
							message: 'The room has already been associated to this queue.'
						});
						return;
					}
				
					res.status(201);
					res.end();
				});
			});
		});
	});
});

// ta bort en association mellan ett rum och en kö
router.delete('/queues/:name/rooms/:room_id', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (!has_permission) {
				res.status(401);
				res.end();
				return;
			}
		
			model.get_room(req.params.room_id).then(room => {
				if (room === null) {
					res.status(404);
					return;
				}
			
				model.remove_room_from_queue(room, queue).then(was_removed => {
					if (!was_removed) {
						res.status(400);
						res.json({
							error: 'NOT_ASSOCIATED',
							message: 'The room is not associated with the queue.'
						});
						return;
					}
			
					res.status(200);
					res.end();
				});
			});
		});
	});
});

// ge information om vitlistade studenter för en kö
router.get('/queues/:name/students', (req, res) => {
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		model.has_permission(queue, req.session.hasOwnProperty('profile') ? req.session.profile.id : null).then(has_permission => {
			if (!has_permission) {
				queue.Students = queue.Students.map(s => {
					if (req.session.hasOwnProperty('profile') && req.session.profile.id === s.id) {
						return s;
					} else {
						return null;
					}
				});
			}
			
			res.json(queue.Students.map(s => s === null ? null : {
				id: s.id,
				user_name: s.user_name,
				name: s.name
			}));
		});
	});
});

// vitlista en student
router.post('/queues/:name/students', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		if (req.body.hasOwnProperty('user_id') && req.body.hasOwnProperty('user_name')) {
			res.status(400);
			res.json({
				error: 'DUPLICATE_PARAMETERS',
				message: 'Specify either user_id or user_name as parameter.'
			});
			return;
		}
		
		var profile_promise = null;
		
		if (req.body.hasOwnProperty('user_id')) {
			if (typeof req.body.user_id !== 'string') {
				res.status(400);
				res.json({
					error: 'INVALID_PARAMETER_USER_ID',
					message: 'Missing or invalid user_id parameter.'
				});
				return;
			}
			
			profile_promise = model.get_profile(req.body.user_id);
		} else if (req.body.hasOwnProperty('user_name')) {
			if (typeof req.body.user_name !== 'string') {
				res.status(400);
				res.json({
					error: 'INVALID_PARAMETER_USER_NAME',
					message: 'Missing or invalid user_name parameter.'
				});
				return;
			}
			
			profile_promise = model.get_profile_by_user_name(req.body.user_name);
		} else {
			res.status(400);
			res.json({
				error: 'MISSING_PARAMETER',
				message: 'Specify one of user_id and user_name as parameter.'
			});
			return;
		}
		
		profile_promise.then(student => {
			if (student === null) {
				res.status(400);
				res.json({
					error: 'UNKNOWN_USER',
					message: 'No student with the given ID exists.'
				});
				return;
			}
			
			model.has_permission(queue, req.session.profile.id).then(has_permission => {
				if (!has_permission) {
					res.status(401);
					res.end();
					return;
				}
			
				model.add_student_to_queue(student, queue).then(was_added => {
					if (!was_added) {
						res.status(400);
						res.json({
							error: 'ALREADY_WHITELISTED',
							message: 'The student is already on the whitelist for this queue.'
						});
						return;
					}
				
					res.status(201);
					res.end();
				});
			});
		});
	});
});

// ta bort en student från vitlistan i en kö
router.delete('/queues/:name/students/:user_id', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (!has_permission) {
				res.status(401);
				res.end();
				return;
			}
			
			model.get_profile(req.params.user_id).then(student => {
				if (student === null) {
					res.status(404);
					return;
				}
			
				model.remove_student_from_queue(student, queue).then(was_removed => {
					if (!was_removed) {
						res.status(400);
						res.json({
							error: 'NOT_WHITELISTED',
							message: 'The student is not on the whitelist for this queue.'
						});
						return;
					}
			
					res.status(200);
					res.end();
				});
			});
		});
	});
});

// ge information om assistenter för en kö
router.get('/queues/:name/assistants', (req, res) => {
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		res.json(queue.Assistants.map(a => ({
			id: a.id,
			user_name: a.user_name,
			name: a.name
		})));
	});
});

// lägg till en assistent
router.post('/queues/:name/assistants', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		if (req.body.hasOwnProperty('user_id') && req.body.hasOwnProperty('user_name')) {
			res.status(400);
			res.json({
				error: 'DUPLICATE_PARAMETERS',
				message: 'Specify either user_id or user_name as parameter.'
			});
			return;
		}
		
		var profile_promise = null;
		
		if (req.body.hasOwnProperty('user_id')) {
			if (typeof req.body.user_id !== 'string') {
				res.status(400);
				res.json({
					error: 'INVALID_PARAMETER_USER_ID',
					message: 'Missing or invalid user_id parameter.'
				});
				return;
			}
			
			profile_promise = model.get_profile(req.body.user_id);
		} else if (req.body.hasOwnProperty('user_name')) {
			if (typeof req.body.user_name !== 'string') {
				res.status(400);
				res.json({
					error: 'INVALID_PARAMETER_USER_NAME',
					message: 'Missing or invalid user_name parameter.'
				});
				return;
			}
			
			profile_promise = model.get_profile_by_user_name(req.body.user_name);
		} else {
			res.status(400);
			res.json({
				error: 'MISSING_PARAMETER',
				message: 'Specify one of user_id and user_name as parameter.'
			});
			return;
		}
		
		profile_promise.then(assistant => {
			if (assistant === null) {
				res.status(400);
				res.json({
					error: 'UNKNOWN_USER',
					message: 'No user with the given ID exists.'
				});
				return;
			}
			
			model.has_permission(queue, req.session.profile.id).then(has_permission => {
				if (!has_permission) {
					res.status(401);
					res.end();
					return;
				}
			
				model.add_assistant_to_queue(assistant, queue).then(was_added => {
					if (!was_added) {
						res.status(400);
						res.json({
							error: 'ALREADY_ASSISTANT',
							message: 'The user is already an assistant for this queue.'
						});
						return;
					}
				
					res.status(201);
					res.end();
				});
			});
		});
	});
});

// ta bort en assistent från en kö
router.delete('/queues/:name/assistants/:user_id', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (!has_permission) {
				res.status(401);
				res.end();
				return;
			}
			
			model.get_profile(req.params.user_id).then(assistant => {
				if (assistant === null) {
					res.status(404);
					return;
				}
			
				model.remove_assistant_from_queue(assistant, queue).then(was_removed => {
					if (!was_removed) {
						res.status(400);
						res.json({
							error: 'NOT_ASSISTANT',
							message: 'The user is not an assistant for this queue.'
						});
						return;
					}
			
					res.status(200);
					res.end();
				});
			});
		});
	});
});

// ge information om schemalagda händelser för en kö
router.get('/queues/:name/tasks', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (!has_permission) {
				res.status(401);
				res.end();
				return;
			}

			model.get_tasks(queue).then(tasks => {
				res.json(tasks.map(t => ({
					id: t.id,
					type: t.type,
					data: JSON.parse(t.data),
					deadline: t.deadline
				})));
			});
		});
	});
});

// schemlägg en ny händelse för en kö
router.post('/queues/:name/tasks', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		if (!req.body.hasOwnProperty('type') || (req.body.type !== 'OPEN' && req.body.type !== 'CLOSE')) {
			res.status(400);
			res.json({
				error: 'INVALID_PARAMETER_TYPE',
				message: 'Missing or invalid type parameter.'
			});
			return;
		}

		if (!req.body.hasOwnProperty('data') || typeof req.body !== 'object') {
			res.status(400);
			res.json({
				error: 'INVALID_PARAMETER_DATA',
				message: 'Missing or invalid data parameter.'
			});
			return;
		}
		
		const data = {};
		
		if (!req.body.hasOwnProperty('deadline') || !Number.isInteger(req.body.deadline)) {
			res.status(400);
			res.json({
				error: 'INVALID_PARAMETER_DEADLINE',
				message: 'Missing or invalid deadline parameter. Must be a UNIX timestamp.'
			});
			return;
		}

		if (Date.now() >= req.body.deadline) {
			res.status(400);
			res.json({
				error: 'DEADLINE_ALREADY_PASSED',
				message: 'The deadline is in the past.'
			});
			return;
		}
		
		model.add_task_to_queue(queue, req.body.type, data, req.body.deadline).then(task => {
			res.status(201);
			res.end();
		});
	});
});

// ta bort en schemalagd händelse för en kö
router.delete('/queues/:name/tasks/:task_id', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (!has_permission) {
				res.status(401);
				res.end();
				return;
			}
			
			model.get_task(req.params.task_id).then(task => {
				if (task === null || task.queue_id !== queue.id) {
					res.status(404);
					return;
				}
			
				model.remove_task(task).then(() => {
					res.status(200);
					res.end();
				});
			});
		});
	});
});

// ge information om bokningar för en kö
router.get('/queues/:name/bookings', (req, res) => {
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		model.get_bookings(queue).then(bookings => {
			res.json(bookings.map(b => nice_booking(b)));
		});
	});
});

// skapa en bokning för en kö
router.post('/queues/:name/bookings', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}

	const external_id = req.body.hasOwnProperty('external_id') ? req.body.external_id : null;
	const removal_duration = req.body.hasOwnProperty('removal_duration') ? req.body.removal_duration : 86400000;
	var comment = req.body.hasOwnProperty('comment') ? req.body.comment : null;
	var location = req.body.hasOwnProperty('location') ? req.body.location : null;
	
	if (external_id !== null && typeof external_id !== 'string') {
		res.status(400);
		res.json({
			error: 'INVALID_PARAMETER_EXTERNAL_ID',
			message: 'The external_id parameter, if specified, must be a string.'
		});
		return;
	}

	if (!req.body.hasOwnProperty('timestamp') || !Number.isInteger(req.body.timestamp)) {
		res.status(400);
		res.json({
			error: 'INVALID_PARAMETER_TIMESTAMP',
			message: 'Missing or invalid timestamp parameter. Must be a UNIX timestamp.'
		});
		return;
	}

	const timestamp = req.body.timestamp;

	if (removal_duration !== null && (!Number.isInteger(removal_duration) || removal_duration < 0)) {
		res.status(400);
		res.json({
			error: 'INVALID_PARAMETER_REMOVAL_DURATION',
			message: 'The removal_duration parameter, if specified, must be a non-negative integer.'
		});
		return;
	}
	
	if (comment !== null && typeof comment !== 'string') {
		res.status(400);
		res.json({
			error: 'INVALID_PARAMETER_COMMENT',
			message: 'The comment parameter, if specified, must be a string.'
		});
		return;
	}
	
	if (location !== null && typeof location !== 'string') {
		res.status(400);
		res.json({
			error: 'INVALID_PARAMETER_LOCATION',
			message: 'The location parameter, if specified, must be a string.'
		});
		return;
	}

	if (comment !== null && comment.length === 0) {
		comment = null;
	}

	if (location !== null && location.length === 0) {
		location = null;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		if (!req.body.hasOwnProperty('students') || !Array.isArray(req.body.students) || req.body.students.filter(x => typeof x !== 'object' || x === null).length > 0) {
			res.status(400);
			res.json({
				error: 'INVALID_PARAMETER_STUDENTS',
				message: 'Missing or invalid students parameter. Must be a list of strings.'
			});
			return;
		}

		model.get_students(req.body.students).then(students => {
			if (students === null) {
				res.status(400);
				res.json({
					error: 'INVALID_STUDENT',
					message: 'At least one of the items in the list of students was not a valid student.'
				});
				return;
			}

			model.has_permission(queue, req.session.profile.id).then(has_permission => {
				if (!has_permission) {
					res.status(401);
					res.end();
					return;
				}

				model.create_booking(queue, external_id, timestamp, removal_duration, comment, location, students).then(booking => {
					model.io_emit_update_booking(queue, nice_booking(booking));

					res.status(201);
					res.json(nice_booking(booking));
				});
			});
		});
	});
});

// ändra en bokning för en kö
router.patch('/queues/:name/bookings/:id', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}

	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}

		// hitta vilken student i kön det berör
		model.get_booking(queue, req.params.id).then(booking => {
			if (booking === null) {
				res.status(404);
				res.end();
				return;
			}
	
			update_booking(queue, booking, {}, req, res, Object.keys(req.body));
		});
	});
});

const update_booking = (queue, booking, changes, req, res, keys) => {
	if (keys.length === 0) {
		const changes_keys = Object.keys(changes);

		if (changes_keys.length === 0) {
			res.status(400);
			res.json({
				error: 'NOTHING_TO_CHANGE',
				message: 'Specify at least one parameter to change.'
			});
			return;
		}

		const needs_permission = changes_keys.includes('external_id')
							  || changes_keys.includes('timestamp')
							  || changes_keys.includes('removal_duration')
							  || changes_keys.includes('comment')
							  || changes_keys.includes('location')
							  || changes_keys.includes('students')
							  || changes_keys.includes('bad_location')
							  || changes_keys.includes('is_handling');

		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (needs_permission && !has_permission) {
				res.status(401);
				res.end();
				return;
			}

			var p = null;

			for (const changes_key of changes_keys) {
				if (changes_key === 'students') {
					p = booking.setBookingStudents(changes.students);
				} else if (changes_key === 'bad_location') {
					model.set_booking_bad_location(booking, changes.bad_location);
				} else if (changes_key === 'is_handling') {
					const handlers = model.get_booking_vinfo(booking).handlers.filter(x => x.id !== req.session.profile.id);

					if (changes.is_handling) {
						handlers.push({
							id: req.session.profile.id,
							user_name: req.session.profile.user_name,
							name: req.session.profile.name
						})
					}

					model.set_booking_handlers(booking, handlers);
				} else {
					booking[changes_key] = changes[changes_key];

					if (changes_key === 'location' && changes.location !== null && !changes_keys.includes('bad_location')) {
						model.set_booking_bad_location(booking, false);
					}
				}
			}

			if (p === null) {
				p = new Promise((resolve, reject) => resolve());
			}

			p.then(() => {
				booking.save().then(x => {
					if (changes_keys.includes('timestamp')) {
						model.remove_expired_bookings();
					}

					model.io_emit_update_booking(queue, nice_booking(booking));

					res.status(200);
					res.end();
				});
			});
		});
	} else {
		const key = keys.shift();

		if (key === 'location' && (req.body.location === null || typeof req.body.location === 'string')) {
			// endast de som är skrivna på bokningen kan ändra platsen
			if (booking.BookingStudents.findIndex(x => x.id === req.session.profile.id) === -1) {
				res.status(401);
				res.end();
				return;
			}

			if (req.body.location !== null && req.body.location.length === 0) {
				changes.location = null;
			} else {
				changes.location = req.body.location;
			}

			update_booking(queue, booking, changes, req, res, keys);
		} else if (
			(key === 'external_id' && (req.body.external_id === null || typeof req.body.external_id === 'string'))
		 || (key === 'timestamp' && Number.isInteger(req.body.timestamp) && req.body.timestamp >= 0)
		 || (key === 'removal_duration' && (req.body.removal_duration === null || (Number.isInteger(req.body.removal_duration) && req.body.removal_duration >= 0)))
		 || (key === 'comment' && (req.body.comment === null || typeof req.body.comment === 'string'))
		 || (key === 'is_handling' && typeof req.body.is_handling === 'boolean')
		 || (key === 'bad_location' && typeof req.body.bad_location === 'boolean')) {
			if (key === 'comment' && req.body.comment !== null && req.body.comment.length === 0) {
				changes.comment = null;
			} else {
				changes[key] = req.body[key];
			}

			update_booking(queue, booking, changes, req, res, keys);
		} else if (key === 'students' && Array.isArray(req.body.students) && req.body.students.filter(x => typeof x !== 'object' || x === null).length === 0) {
			model.get_students(req.body.students).then(students => {
				if (students === null) {
					res.status(400);
					res.json({
						error: 'INVALID_STUDENT',
						message: 'At least one of the items in the list of students was not a valid student.'
					});
					return;
				}

				changes.students = students;
				update_booking(queue, booking, changes, req, res, keys);
			});
		} else {
			res.status(400);
			res.json({
				error: 'UNKNOWN_PARAMETER',
				message: 'An unknown parameter or an invalid value was specified.'
			});
			return;
		}
	}
};

// ta bort en bokning för en kö
router.delete('/queues/:name/bookings/:id', (req, res) => {
	if (!req.session.hasOwnProperty('profile')) {
		res.status(401);
		res.end();
		return;
	}
	
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(404);
			res.end();
			return;
		}
		
		model.has_permission(queue, req.session.profile.id).then(has_permission => {
			if (!has_permission) {
				res.status(401);
				res.end();
				return;
			}
			
			model.get_booking(queue, req.params.id).then(booking => {
				if (booking === null) {
					res.status(404);
					return;
				}

				model.delete_booking(booking).then(() => {
					res.status(200);
					res.end();
				});
			});
		});
	});
});

const nice_booking = booking => {
	const vinfo = model.get_booking_vinfo(booking);

	return {
		id: booking.id,
		external_id: booking.external_id,
		timestamp: booking.timestamp,
		removal_duration: booking.removal_duration,
		comment: booking.comment,
		location: booking.location,
		students: booking.BookingStudents.map(student => ({
			id: student.id,
			user_name: student.user_name,
			name: student.name
		})),
		bad_location: vinfo.bad_location,
		handlers: vinfo.handlers
	};
};

const valid_queue_name = name => /^([A-ZÅÄÖÆØa-zåäöæø0-9_\-]{1,20})$/.test(name);

module.exports = router;
