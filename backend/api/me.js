'use strict'

const express = require('express')

const model = require('../model')

const router = express.Router()

// hämta profilen för den inloggade användaren
router.get('/', (req, res) => {
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
						is_kthlan: model.is_kthlan(req.connection.remoteAddress)
					})
				})
			})
		} else {
			res.json({
				profile: null,
				assisting_in: [],
				location: location,
				is_kthlan: model.is_kthlan(req.connection.remoteAddress)
			})
		}
	})
})

module.exports = router
