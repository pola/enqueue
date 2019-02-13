/* jslint node: true */
"use strict";

const Sequelize = require('sequelize');

var Queue = null;
var Room = null;
var Computer = null;
var Profile = null;
var QueueStudent = null;
var Action = null;

var io = null;
var connection = null;
var locked_time_slots = {};
var students = {};

exports.setIo = (io2) => {
	// TOOD: kan det här bli finare?
	io = io2;
};

exports.setConnection = (connection2) => {
	// TOOD: kan det här bli finare?
	connection = connection2;

	Queue = connection.define('queue', {
		id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
		name : Sequelize.STRING,
		description: Sequelize.STRING,
		open: Sequelize.BOOLEAN,
		auto_open: Sequelize.DATE,
		auto_purge: Sequelize.STRING,
		force_comment: Sequelize.BOOLEAN,
		force_action: Sequelize.BOOLEAN
	});

	Room = connection.define('room', {
		id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		name : Sequelize.STRING
	});

	// För att koppla köer till rum
	Queue.belongsToMany(Room, { as: 'Rooms', through: 'queues_rooms', foreignKey: 'room_id' });
	Room.belongsToMany(Queue, { as: 'Queues', through: 'queues_rooms', foreignKey: 'queue_id' });

	Computer = connection.define('computer', {
		id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		name : Sequelize.STRING,
		ip: Sequelize.STRING
	});

	// För att koppla datorer till rum
	Computer.belongsTo(Room, { foreignKey: 'room_id' });

	Profile = connection.define('profile', {
		id: { type: Sequelize.STRING, primaryKey: true}, // u1-numret
		user_name: Sequelize.STRING,
		name: Sequelize.STRING,
		teacher: Sequelize.BOOLEAN
	});

	// För att koppla assistenter till köeer
	Queue.belongsToMany(Profile, { as: 'Assistants', through: 'queues_assistants', foreignKey: 'assistant_id' });
	Profile.belongsToMany(Queue, { as: 'Queues', through: 'queues_assistants', foreignKey: 'queue_id' });

	// T ex present och help
	Action = connection.define('actions', {
		id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		name: Sequelize.STRING,
		color: Sequelize.ENUM("red","blue", "green", "yellow", "pink", "purple", "grey")
	});

	// För att ange vilka actions en student kan välja på i kön
	Action.belongsTo(Queue, { foreignKey: 'queue_id' });

	connection.sync().then(() => {
		Queue.findAll().then(queues => {
			for (const queue of queues) {
				students[queue.id] = [];
			}
		});
	});
};

exports.get_or_create_profile = function(id, user_name, name) {
	return new Promise(function(resolve, reject) {
		Profile.findOrCreate({
			where: { id: id },
			defaults: {
				id: id,
				user_name: user_name,
				name: name,
				teacher: false
			}
		}).spread((profile, created) => {
			 resolve(profile);
		});
	});
};

exports.get_teachers = function() {
	return new Promise(function(resolve, reject) {
		Profile.findAll({ where: { teacher: true } }).then(teachers => {
			resolve(teachers);
		});
	});
}

exports.add_teacher = function(user_name) {
	return new Promise(function(resolve, reject) {
		Profile.findOne({ where: {user_name: user_name} }).then(profile => {
			if (profile === null) {
				reject();
			} else {
				profile.teacher = true;
				profile.save().then(() => {
					Profile.findAll({ where: { teacher: true } }).then(teachers => {
						io.sockets.emit('teachers', teachers);
					});
				});

				resolve(profile);
			}
		});
	});
};

exports.remove_teacher = function(id) {
	return new Promise(function(resolve, reject) {
		Profile.findOne({ where: { id: id } }).then(profile => {
			if (profile === null) {
				reject();
			} else {
				profile.teacher = false;
				profile.save().then(() => {
					Profile.findAll({ where: { teacher: true } }).then(teachers => {
						io.sockets.emit('teachers', teachers);
					});
				});

				resolve();
			}
		});
	});
};

exports.get_queues = function() {
	return new Promise(function(resolve, reject) {
		Queue.findAll().then(queues => {
			resolve(queues);
		});
	});
};

exports.get_or_create_queue = function(name) {
	return new Promise(function(resolve, reject) {
		Queue.findOrCreate({
			where: { name: name },
			defaults: {
				name : name,
				description: null,
				open: false,
				auto_open: null,
				auto_purge: null,
				force_comment: true,
				queuing: []
			}
		}).spread((queue, created) => {
			if (created === true){
				Action.bulkCreate([
					{ name: "Help",
					color: "blue",
				 	queue_id: queue.id },
					{ name: "Present",
					color: "green",
				 	queue_id: queue.id }
				]).then(() => {
					resolve(queue);
				});
			} else{
				resolve(queue);
			}
		});
	});
};

exports.get_queue = function(name) {
	return new Promise(function(resolve, reject) {
		Queue.findOne({ where: { name: name } }).then(queue => {
			if (queue === null) {
				reject();
			} else {
				resolve(queue);
			}
		});
	});
};

exports.get_actions = function(queue) {
	return new Promise(function(resolve, reject) {
		Action.findAll({ where: { queue_id: queue.id } }).then(actions => {
			resolve(actions);
		});
	});
};

exports.get_action = function(id) {
	return new Promise(function(resolve, reject) {
		Action.findOne({ where: { id: id } }).then(action => {
			if (action === null) {
				reject();
			} else {
				resolve(action);
			}
		});
	});
};

exports.get_students = function(queue) {
	return students[queue.id];
};

exports.add_student = function(queue, profile, comment, location, action) {
	students[queue.id].push({
		profile: profile,
		entered_at: Date.now,
		comment: comment,
		location: location,
		action: action,
		receiving_help_from: null
	});
};
