'use strict';

const model = require("../model.js");
const express = require('express');
const CASAuthentication = require('cas-authentication');
const config = require('../config.js');

const router = express.Router();

const cas = new CASAuthentication({
	cas_url: 'https://login.kth.se',
	service_url: config.hostname,
	destroy_session: true,
	renew: true
});

router.get('/login', cas.bounce_redirect);
router.get('/logout', cas.logout);

module.exports = router;
