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
		res.json(queues);
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
				queuing: queue.queuing,
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
		res.end();
	}
	
	if (!('comment' in req.body)) {
		res.status(400);
		res.json({
			'status': 'error',
			'code': 1,
			'message': 'Missing comment'
		});
	}
	
	model.get_queue(req.params.name).then(queue => {
		res.json(queue);
	}).catch(() => {
		res.status(404);
		res.end();
	});
});

module.exports = router;
