const model = require("../model.js");
const express = require('express');
const router = express.Router();

// skickas tillbaka om man skriver /api/time_slots
router.get('/time_slots', function (req, res) {
	const assistants = model.get_assistants();

	console.log('time_slots is reporting');
	console.log(req.session.cas_user);

	assistants.then(function(value) {
		res.json(value);
	});
});


// skickas tillbaka om man skriver /api/time_slots
router.get('/time_slots/:id', function (req, res) {
	const time_slots = model.get_assistant(req.params.id);

	time_slots.then(function(value) {
		res.json(value);
	});
});


// skickas tillbaka om man skriver /api/time_slots
router.get('/admins', function (req, res) {
	const admins = model.get_admins();

	admins.then(function(value) {
		res.json(value);
	});
});


// boka en tid givet ett ID i adressfältet och ett namn i PUT-datan
router.put('/time_slots/:id', function (req, res) {
	// TODO: skriv den här koden
});


module.exports = router;
