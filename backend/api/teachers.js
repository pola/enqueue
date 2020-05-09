'use strict'

const express = require('express')

const model = require('../model')

const router = express.Router()

// hämta alla lärarprofiler
router.get('/', (req, res) => {
	if (!req.session.hasOwnProperty('profile') || !req.session.profile.teacher) {
		res.status(401)
		res.json([])
		return
	}

	model.get_teachers().then(teachers => {
		res.json(teachers)
	})
})

// lägg till en profil som lärare
router.post('/', (req, res) => {
	if (!req.session.hasOwnProperty('profile') || !req.session.profile.teacher) {
		res.status(401)
		res.end()
		return
	}

	model.get_profile_by_user_name(req.body.user_name).then(profile => {
		if (profile === null) {
			res.status(400)
			res.json({
				error: 'UNKNOWN_USER',
				message: 'No user with the given user name exists.'
			})
			return
		}

		if (profile.teacher) {
			res.status(400)
			res.json({
				error: 'ALREADY_TEACHER',
				message: 'The user is already a teacher.'
			})
			return
		}

		model.add_teacher(profile)
	})
})

// ta bort en profil som lärare
router.delete('/:id', (req, res) => {
	if (!req.session.hasOwnProperty('profile') || !req.session.profile.teacher) {
		res.status(401)
		res.end()
		return
	}

	model.get_profile(req.params.id).then(profile => {
		if (profile === null || !profile.teacher) {
			res.status(404)
			res.end()
			return
		}

		// man kan inte ta bort sig själv som lärare
		if (profile.id === req.session.profile.id) {
			res.status(401)
			res.end()
			return
		}

		model.remove_teacher(profile)
	})
})

module.exports = router
