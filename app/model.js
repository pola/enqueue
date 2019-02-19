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

exports.get_io = () => io;

exports.colors = ['primary', 'secondary', 'default', 'accent'];

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
		color: {
			type: Sequelize.ENUM,
			values: exports.colors
		}
	});

	// För att ange vilka actions en student kan välja på i kön
	Action.belongsTo(Queue, { foreignKey: 'queue_id' });

	connection.sync().then(() => {
		Queue.findAll().then(queues => {
			for (const queue of queues) {
				students[queue.id] = [];
			}
		});

		Queue.findOne({ where: { name: 'tilpro' } }).then(queue => {
			Profile.findOne({ where: { id: 'u1tm1nqn' } }).then(profile => {

			});
		});
	});
};

exports.get_or_create_profile = (id, user_name, name) => {
	return new Promise((resolve, reject) => {
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

exports.get_teachers = () => {
	return new Promise((resolve, reject) => {
		Profile.findAll({ where: { teacher: true } }).then(teachers => {
			resolve(teachers);
		});
	});
}

exports.add_teacher = (user_name) => {
	return new Promise((resolve, reject) => {
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

exports.remove_teacher = (id) => {
	return new Promise((resolve, reject) => {
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

exports.get_queues = () => {
	return new Promise((resolve, reject) => {
		Queue.findAll().then(queues => {
			resolve(queues);
		});
	});
};

exports.get_queue = (name) => Queue.findOne({ where: { name: name } });

exports.get_or_create_queue = (name) => {
	return new Promise((resolve, reject) => {
		Queue.findOrCreate({
			where: { name: name },
			defaults: {
				name : name,
				description: null,
				open: false,
				auto_open: null,
				auto_purge: null,
				force_comment: true,
				force_action: true,
				queuing: []
			}
		}).spread((queue, created) => {
			if (created === true){
				students[queue.id] = [];

				Action.bulkCreate([
					{ name: "Help",
					color: "primary",
				 	queue_id: queue.id },
					{ name: "Present",
					color: "accent",
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

exports.delete_queue = (queue) => {
	return new Promise((resolve, reject) => {
		Queue.destroy({ where: { id: queue.id } }).then(() => {
			delete students[queue.id];

			io.emit('queue_delete', queue.id);

			resolve();
		});
	});
};

exports.get_queue = name => Queue.findOne({ where: { name: name } });

exports.get_computer = ip => Computer.findOne({ where: { ip: ip } });

exports.get_actions = (queue) => {
	return new Promise((resolve, reject) => {
		Action.findAll({ where: { queue_id: queue.id } }).then(actions => {
			resolve(actions);
		});
	});
};

exports.get_action_by_id = (id) => Action.findOne({ where: { id: id } });

exports.get_action_by_name = (queue, name) => Action.findOne({ where: { queue_id: queue.id, name: name } });

exports.create_action = (queue, name, color) => {
	return new Promise((resolve, reject) => {
		Action.create({
			queue_id: queue.id,
			name: name,
			color: color
		}).then(action => {
			exports.io_emit_queue_actions(queue);

			resolve(action);
		});
	});
};

exports.get_students = queue => {
	return students[queue.id];
};

exports.add_student = (queue, profile, comment, location, action) => {
	students[queue.id].push({
		profile: profile,
		entered_at: Date.now,
		comment: comment,
		location: location,
		action: action,
		receiving_help_from: null
	});

	exports.io_emit_queue_students(queue);
};

exports.move_student_after = (queue, student, move_after) => {
	const s = exports.get_students(queue);
	var remove_index = null;

	for (var i = 0; i < s.length; i++) {
		if (s[i].profile.id === student.profile.id) {
			remove_index = i;
			break;
		}
	}

	if (remove_index === null) {
		console.log('!!!');
		return;
	}

	if (move_after === null) {
		s.splice(remove_index, 1);
		s.unshift(student);

		exports.io_emit_queue_students(queue);
	} else {
		for (var i = 0; i < s.length; i++) {
			if (s[i].profile.id === move_after) {
				s.splice(i + 1, 0, student);
				break;
			}
		}

		s.splice(remove_index, 1);

		exports.io_emit_queue_students(queue);
	}
};

// TODO: den här ger alltid tillbaka alla rum, oberoende av vilken queue man skickar in som parameter
exports.get_allowed_rooms = (queue) => Room.findAll({
	where: { id: 1337 },
	include: [{
		model: Queue,
		as: 'Queues'
    }]
});

// används för att se om en användare, givet ett köobjekt och användarens ID, har lärar- eller assistenträttigheter i en kö
exports.has_permission = (queue, profile_id) => {
	return new Promise((resolve, reject) => {
		Profile.findOne({ where: { id: profile_id }}).then(profile => {
			if (profile.teacher) {
				resolve(true);
				return;
			}

			profile.hasQueue(queue).then(result => {
				resolve(result);
			});
		});
	});
}

exports.io_emit_queue_students = (queue) => {
	io.emit('queue_students', {
		queue: queue.id,
		students: students[queue.id]
	});
};

exports.io_emit_queue_actions = (queue) => {
	exports.get_actions(queue).then(actions => {
		io.emit('queue_actions', {
			queue: queue.id,
			actions: actions
		});
	});
};
