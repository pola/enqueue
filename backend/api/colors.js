'use strict'

const express = require('express')

const model = require('../model')

const router = express.Router()

// hämta alla färger som actions kan ha
router.get('/', (req, res) => {
	res.json(model.colors)
})

module.exports = router
