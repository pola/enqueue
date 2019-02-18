const model = require("../model.js");
const express = require('express');
const router = express.Router();

// hämta profilen för den inloggade användaren
router.get('/profile', function (req, res) {
	if ('cas_user' in req.session) {
		res.json({
			id: req.session.cas_user,
			user_name: req.session.cas_user,
			name: req.session.cas_user,
			teacher: req.session.teacher
		});
	} else {
		res.json(null);
	}
});

// hämta alla lärarprofiler
router.get('/admin/teachers', function (req, res) {
	if (!('teacher' in req.session) || !req.session.teacher) {
		res.status(401);
		res.json([]);
		return;
	}

	model.get_teachers().then(teachers => {
		res.json(teachers);
	});
});

// lägg till en profil som lärare
router.post('/admin/teachers', function (req, res) {
	if (!('teacher' in req.session) || !req.session.teacher) {
		res.status(401);
		res.end();
		return;
	}

	model.add_teacher(req.body.user_name).then(profile => {
		res.status(201);
		res.end();
	}).catch(() => {
		res.status(400);
		res.end();
	});
});

// ta bort en profil som lärare
router.delete('/admin/teachers/:id', function (req, res) {
	if (!('teacher' in req.session) || !req.session.teacher) {
		res.status(401);
		res.end();
		return;
	}

	// man kan inte ta bort sig själv som lärare
	if (req.params.id === req.session.cas_user) {
		res.status(401);
		res.end();
		return;
	}

	model.remove_teacher(req.params.id).then(() => {
		res.status(200);
		res.end();
	}).catch(() => {
		res.status(400);
		res.end();
	});
});

// ge (grundläggande) information om alla köer
router.get('/queues', function (req, res) {
	model.get_queues().then(queues => {
		res.json(queues.map(queue => ({
			name: queue.name,
			open: queue.open,
			queuing_count: model.get_students(queue).length
		})));
	});
});

// skapa en ny kö
router.post('/queues', function (req, res) {
	if (!('teacher' in req.session) || !req.session.teacher) {
		res.status(401);
		res.end();
		return;
	}

	if (!valid_queue_name(req.body.name)) {
		res.status(400);
		res.json({
			error: 1,
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
router.get('/queues/:name', function (req, res) {
	model.get_queue(req.params.name).then(queue => {
		if (queue === null) {
			res.status(401);
			res.end();
			return;
		}

		model.get_actions(queue).then(actions => {
			res.json({
				name: queue.name,
				description: queue.description,
				open: queue.open,
				force_comment: queue.force_comment,
				force_action: queue.force_action,
				students: model.get_students(queue),
				actions: actions
			});
		});
	});
});

// radera en kö
router.delete('/queues/:name', function (req, res) {
	if (!('cas_user' in req.session)) {
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

		if (!req.session.profile.teacher /* TODO: rättigheter som assistent i den aktuella kön */) {
			res.status(401);
			res.end();
			return;
		}

		model.delete_queue(queue).then(() => {
			res.status(200);
			res.end();

			// TODO: informera via websockets
		});
	});
});

// ny student i kön
router.post('/queues/:name/students', function (req, res) {
	if (!('cas_user' in req.session)) {
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

		if (!queue.open) {
			res.status(400);
			res.json({
				error: 1,
				message: 'The queue is not open.'
			});
			return;
		}

		// man kan inte gå in i en kö som man redan står i (då får man PUT:a med ny data)
		for (const student of model.get_students(queue)) {
			if (student.profile.id === req.session.profile.id) {
				res.status(400);
				res.json({
					error: 2,
					message: 'You are already standing in the queue.'
				});
				return;
			}
		}

		if (!('comment' in req.body) || !('action' in req.body) || !('location' in req.body)) {
			res.status(400);
			res.json({
				error: 3,
				message: 'Missing comment, action or location.'
			});
			return;
		}

		if ((req.body.comment !== null && typeof(req.body.comment) !== 'string') || (req.body.action !== null && typeof(req.body.action) !== 'number') || (req.body.location !== null && typeof(req.body.comment) !== 'string')) {
			res.status(400);
			res.json({
				error: 4,
				message: 'Invalid comment, action or location.'
			});
			return;
		}

		if ((req.body.comment === null || req.body.comment.length === 0) && queue.force_comment) {
			res.status(400);
			res.json({
				error: 5,
				message: 'A comment is required.'
			});
			return;
		}

		if (req.body.action === null && queue.force_action) {
			res.status(400);
			res.json({
				error: 6,
				message: 'An action is required.'
			});
			return;
		}

		model.get_computer(req.connection.remoteAddress).then(computer => {
			model.get_allowed_rooms(queue).then(rooms => {
				// blir antingen en sträng eller en datorplats ({id: ..., name: ...})
				var location;

				// klienten sitter vid en identifierad dator
				if (computer !== null) {
					// men är datorn i listan på godkända rum?
					if (rooms.length !== 0) {
						var room_ok = false;

						for (const room of rooms) {
							if (room.id === computer.room_id) {
								room_ok = true;
								break;
							}
						}

						if (!room_ok) {
							res.status(400);
							res.json({
								error: 7,
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
				} else if (req.body.location === null) {
					res.status(400);
					res.json({
						error: 8,
						message: 'A location is required.'
					});
					return;
				} else {
					// om man måste sitta i ett särskilt rum måste man sitta vid en identifierad dator
					if (rooms.length !== 0) {
						res.status(400);
						res.json({
							error: 9,
							message: 'You must sit in one of the specified rooms.'
						});
						return;
					}

					location = req.body.location;
				}

				if (req.body.action === null) {
					model.add_student(queue, req.session.profile, req.body.comment, location, null);

					res.status(201);
					res.end();
					return;

					// TODO: berätta för andra via websockets
				} else {
					model.get_action(req.body.action).then(action => {
						if (action === null || action.queue_id !== queue.id) {
							res.status(400);
							res.json({
								error: 10,
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

						model.add_student(queue, req.session.profile, req.body.comment, location, action);

						res.status(201);
						res.end();
						return;

						// TODO: berätta för andra via websockets
					});
				}
			});
		});
	});
});

// lämna kön (om det är en själv) eller sparka ut någon (som assistent)
router.delete('/queues/:name/students/:id', function (req, res) {
	if (!('cas_user' in req.session)) {
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
		const students = model.get_students(queue);

		for (var i = 0; i < students.length; i++) {
			if (students[i].profile.id === req.params.id) {
				found = true;

				if (students[i].profile.id === req.session.profile.id || req.session.profile.teacher /* TODO: rättigheter som assistent i den aktuella kön */) {
					students.splice(i, 1);
				} else {
					res.status(401);
					res.end();
					return;
				}

				break;
			}
		}

		if (!found) {
			res.status(404);
			res.end();
			return;
		}

		res.status(200);
		res.end();

		// TODO: berätta för andra via websockets
	});
});

// ändra en kö
router.patch('/queues/:name', function(req, res) {
	if (!('cas_user' in req.session)) {
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

		if (!req.session.profile.teacher /* TODO: kontrollera om man är assistent i den aktuella kön */) {
			res.status(401);
			res.end();
			return;
		}

		update_queue(queue, {}, req, res, Object.keys(req.body));
	});
});

const update_queue = (queue, changes, req, res, keys) => {
	if (keys.length === 0) {
		const changes_keys = Object.keys(changes);

		if (changes_keys.length === 0) {
			res.status(400);
			res.json({
				error: 1,
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

			// TODO: om det har gjorts en ändring ska vi berätta om den för alla via websockets
		});
	} else {
		const key = keys[0];

		if (key === 'name') {
			keys.shift();

			if (typeof req.body.name !== 'string') {
				res.status(400);
				res.json({
					error: 3,
					message: 'The value for parameter name must be a string.'
				});
				return;
			}

			if (!valid_queue_name(req.body.name)) {
				res.status(400);
				res.json({
					error: 4,
					message: 'The name is invalid.'
				});
				return;
			}

			model.get_queue(req.body.name).then(existing_queue => {
				if (existing_queue !== null && existing_queue.id !== queue.id) {
					res.status(400);
					res.json({
						error: 5,
						message: 'The name is already used by another queue.'
					});
					return;
				}

				changes.name = req.body.name;

				update_queue(queue, changes, req, res, keys);
			});
		} else if (key === 'description') {
			keys.shift();

			if (typeof req.body.description !== 'string') {
				res.status(400);
				res.json({
					error: 6,
					message: 'The value for parameter description must be a string.'
				});
				return;
			}

			changes.description = req.body.description;

			if (changes.description.length === 0) {
				changes.description = 0;
			}

			update_queue(queue, changes, req, res, keys);
		} else if (key === 'open') {
			keys.shift();

			if (!(typeof req.body.open === 'boolean')) {
				res.status(400);
				res.json({
					error: 7,
					message: 'The value for parameter open must be a boolean.'
				});
				return;
			}

			changes.open = req.body.open;

			update_queue(queue, changes, req, res, keys);
		} else if (key === 'auto_open') {
			keys.shift();

			// TODO hantera null eller en tidsstämpel i framtiden

			update_queue(queue, changes, req, res, keys);
		} else if (key === 'auto_purge') {
			keys.shift();

			// TODO: hantera null eller ett klockslag på HH:MM

			update_queue(queue, changes, req, res, keys);
		} else if (key === 'force_comment') {
			keys.shift();

			if (!(typeof req.body.force_comment === 'boolean')) {
				res.status(400);
				res.json({
					error: 8,
					message: 'The value for parameter force_comment must be a boolean.'
				});
				return;
			}

			changes.force_comment = req.body.force_comment;

			update_queue(queue, changes, req, res, keys);
		} else if (key === 'force_action') {
			keys.shift();

			if (!(typeof req.body.force_action === 'boolean')) {
				res.status(400);
				res.json({
					error: 9,
					message: 'The value for parameter force_action must be a boolean.'
				});
				return;
			}

			changes.force_action = req.body.force_action;

			update_queue(queue, changes, req, res, keys);
		} else {
			res.status(400);
			res.json({
				error: 2,
				message: 'An unknown parameter was specified.'
			});
		}
	}
};

// ändra en student i kön
router.patch('/queues/:name/students/:id', function (req, res) {
	if (!('cas_user' in req.session)) {
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

		for (const s of model.get_students(queue)) {
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
				error: 1,
				message: 'Specify at least one parameter to change.'
			});
			return;
		}

		// spara ändringarna
		for (const changes_key of changes_keys) {
			if (changes_key === 'move_after') {
				model.move_student_after(queue, student, changes.move_after);
			} else {
				student[changes_key] = changes[changes_key];
			}
		}

		res.status(200);
		res.end();

		// TODO: om det har gjorts en ändring ska vi berätta om den för alla i kön via websockets
	} else {
		const key = keys[0];

		if (key === 'location' || key === 'comment' || key === 'action') {
			if (student.profile.id !== req.session.profile.id) {
				res.status(401);
				res.end();
				return;
			}

			if (key === 'location') {
				keys.shift();

				model.get_computer(req.connection.remoteAddress).then(computer => {
					model.get_allowed_rooms(queue).then(rooms => {
						// blir antingen en sträng eller en datorplats ({id: ..., name: ...})
						var location;

						// klienten sitter vid en identifierad dator
						if (computer !== null) {
							// men är datorn i listan på godkända rum?
							if (rooms.length !== 0) {
								var room_ok = false;

								for (const room of rooms) {
									if (room.id === computer.room_id) {
										room_ok = true;
										break;
									}
								}

								if (!room_ok) {
									res.status(400);
									res.json({
										error: 6,
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
						} else if (req.body.location === null) {
							res.status(400);
							res.json({
								error: 7,
								message: 'A location is required.'
							});
							return;
						} else {
							// om man måste sitta i ett särskilt rum måste man sitta vid en identifierad dator
							if (rooms.length !== 0) {
								res.status(400);
								res.json({
									error: 8,
									message: 'You must sit in one of the specified rooms.'
								});
								return;
							}

							changes.location = req.body.location;
						}

						update_student(queue, student, changes, req, res, keys);
					});
				});
			}

			if (key === 'comment') {
				keys.shift();

				if ((req.body.comment === null || req.body.comment.length === 0) && queue.force_comment) {
					res.status(400);
					res.json({
						error: 3,
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
							error: 4,
							message: 'An action is required.'
						});
						return;
					}

					changes.action = null;

					update_student(queue, student, changes, req, res, keys);
				} else {
					model.get_action(req.body.action).then(action => {
						if (action === null || action.queue_id !== queue.id) {
							res.status(400);
							res.json({
								error: 5,
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
		} else if (key === 'move_after') {
			keys.shift();

			if (!req.session.profile.teacher /* TODO: kontrollera om man är assistent i den aktuella kön */) {
				res.status(401);
				res.end();
				return;
			}

			if (req.body.move_after !== null) {
				var found = null;

				for (const s of model.get_students(queue)) {
					if (s.profile.id === req.body.move_after) {
						found = true;
						break;
					}
				}

				if (!found) {
					res.status(400);
					res.json({
						error: 10,
						message: 'Cannot find the student specified in parameter move_after.'
					});
					return;
				}
			}

			changes.move_after = req.body.move_after;
			update_student(queue, student, changes, req, res, keys);
		} else {
			res.status(400);
			res.json({
				error: 2,
				message: 'An unknown parameter was specified.'
			});
			return;
		}
	}
};

const valid_queue_name = (name) => /^([A-ZÅÄÖÆØa-zåäöæø0-9_\-]{1,20})$/.test(name);

module.exports = router;
