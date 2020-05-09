'use strict'

const express = require('express')
const cas_authentication = require('cas-authentication')

const model = require('../model')
const config = require('../config')

const router = express.Router()

const cas = new cas_authentication({
	cas_url: 'https://login.kth.se',
	service_url: config.hostname,
	destroy_session: true,
	renew: true
})

router.get('/login', cas.bounce_redirect)
router.get('/logout', cas.logout)

module.exports = router
