const model = require("../model.js");
const express = require('express');
const CASAuthentication = require('cas-authentication');
const config = require('../config.js');
const fetch = require('node-fetch');

const router = express.Router();

const cas = new CASAuthentication({
	cas_url: 'https://login.kth.se',
	service_url: 'http://' + config.hostname + ':' + config.port,
	destroy_session: true
});

router.get('/login', cas.bounce, (req, res) => {
	fetch('https://hodis.datasektionen.se/ugkthid/' + req.session.cas_user).then(result => {
		if (result.status === 200) {
			result.json().then(data => {
				if (data.hasOwnProperty('uid') && data.hasOwnProperty('displayName') && typeof data.uid === 'string' && typeof data.displayName === 'string') {
					finalize_login(req, res, req.session.cas_user, data.uid, data.displayName);
				} else {
					finalize_login(req, res, req.session.cas_user, null, null);
				}
			});
		} else {
			finalize_login(req, res, req.session.cas_user, null, null);
		}
	});
});

const finalize_login = (req, res, id, user_name, name) => {
	model.get_or_create_profile(id, user_name, name).then(profile => {
		req.session.profile = profile;
		res.redirect('/');
	});
};

router.get('/logout', cas.logout);

module.exports = router;
