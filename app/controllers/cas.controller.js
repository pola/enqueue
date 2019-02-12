const model = require("../model.js");
const express = require('express');
const CASAuthentication = require('cas-authentication');

const router = express.Router();

var cas = new CASAuthentication({
	cas_url: 'https://login.kth.se',
	service_url: 'http://sport-04.csc.kth.se:8989'
});

router.get('/login', cas.bounce, function ( req, res ) {
	res.send( '<html><body>Hello ' + req.session[ cas.session_name ] + '!</body></html>' );
});

module.exports = router;
