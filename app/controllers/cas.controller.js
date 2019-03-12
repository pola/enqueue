const model = require("../model.js");
const express = require('express');
const CASAuthentication = require('cas-authentication');
const config = require('../config.js');

const router = express.Router();

var cas = new CASAuthentication({
	cas_url: 'https://login.kth.se',
	service_url: 'http://' + config.hostname + ':' + config.port
});

router.get('/login', cas.bounce, function ( req, res ) {

	model.get_or_create_profile(req.session.cas_user, req.session.cas_user, req.session.cas_user).then(profile => {
		req.session.profile = profile;

		res.redirect('/');
	});
});

router.get('/logout', cas.logout );

module.exports = router;
