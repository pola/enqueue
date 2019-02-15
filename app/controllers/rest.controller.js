const model = require("../model.js");
const express = require('express');
const router = express.Router();

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

router.get('/queues', function (req, res) {
	model.get_queues().then(queues => {
		res.json(queues.map(queue => ({
			name: queue.name,
			open: queue.open,
			queuing_count: model.get_students(queue).length
		})));
	});
});

router.post('/queues', function (req, res) {
	if (!('teacher' in req.session) || !req.session.teacher) {
		res.status(401);
		res.end();
		return;
	}

	model.get_or_create_queue(req.body.name).then(queue => {
		res.status(201);
		res.json(queue);
	}).catch(() => {
		res.status(400);
		res.end();
	});
});

router.get('/queues/:name', function (req, res) {
	model.get_queue(req.params.name).then(queue => {

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
	}).catch(() => {
		res.status(404);
		res.end();
	});
});

router.post('/queues/:name/students', function (req, res) {
	if (!('cas_user' in req.session)) {
		res.status(401);
		res.json({
			error: 1,
			message: 'You need to sign in to join a queue.'
		});
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
				error: 2,
				message: 'The queue is not open.'
			});
			return;
		}

		// man kan inte gå in i en kö som man redan står i (då får man PUT:a med ny data)
		for (const student of model.get_students(queue)) {
			if (student.profile.id === req.session.profile.id) {
				res.status(400);
				res.json({
					error: 3,
					message: 'You are already standing in the queue.'
				});
				return;
			}
		}

		if (!('comment' in req.body) || !('action' in req.body) || !('location' in req.body)) {
			res.status(400);
			res.json({
				error: 4,
				message: 'Missing comment, action or location.'
			});
			return;
		}

		if ((req.body.comment !== null && typeof(req.body.comment) !== 'string') || (req.body.action !== null && typeof(req.body.action) !== 'number') || (req.body.location !== null && typeof(req.body.comment) !== 'string')) {
			res.status(400);
			res.json({
				error: 5,
				message: 'Invalid comment, action or location.'
			});
			return;
		}

		if ((req.body.comment === null || req.body.comment.length === 0) && queue.force_comment) {
			res.status(400);
			res.json({
				error: 6,
				message: 'A comment is required.'
			});
			return;
		}

		if (req.body.action === null && queue.force_action) {
			res.status(400);
			res.json({
				error: 7,
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
								error: 8,
								message: 'Invalid room.'
							});
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
						error: 9,
						message: 'A location is required.'
					});
					return;
				} else {
					// om man måste sitta i ett särskilt rum måste man sitta vid en identifierad dator
					if (rooms.length !== 0) {
						res.status(400);
						res.json({
							error: 10,
							message: 'You must sit in one of the specified rooms.'
						});
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
								error: 11,
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

module.exports = router;
