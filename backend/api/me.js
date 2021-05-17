'use strict'

const express = require('express')

const model = require('../model')

const router = express.Router()

// hämta profilen för den inloggade användaren
router.get('/', async (req, res) => {
	const location = await model.get_computer(req)

	let profile = null
	let assisting_in = []

	if (Object.prototype.hasOwnProperty.call(req.session, 'profile')) {
		profile = await model.get_profile(req.session.profile.id)
		assisting_in = (await profile.getAssistantInQueues()).map(q => ({
			id: q.id,
			name: q.name
		}))
	}

	res.json({
		profile,
		assisting_in,
		location,
		is_kthlan: model.is_kthlan(req)
	})
})

module.exports = router
