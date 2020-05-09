'use strict'

const express = require('express')

const model = require('../model')

const router = express.Router()

// logga in en användare eller ge användaren en nyckel
router.get('/', (req, res) => {
	if (req.header('Token') !== undefined) {
		model.validate_token(req.header('Token')).then(result => {
			if (result === null) {
				res.json({
					authenticated: false,
					token: null
				})
			} else {
				req.session.profile = result.profile
				
				res.json({
					authenticated: true,
					token: result.token
				})
			}
		})
	} else if (req.session.hasOwnProperty('profile')) {
		model.create_token(req.session.profile.id).then(token => {
			res.json({
				authenticated: true,
				token: token.token
			})
		})
	} else {
		res.json({
			authenticated: false,
			token: null
		})
	}
})

module.exports = router
