'use strict'

const express = require('express')

const model = require('../model')

const router = express.Router()

// hämta alla rum
router.get('/', (req, res) => {
	model.get_rooms().then(rooms => {
		res.json(rooms)
	})
})

module.exports = router
