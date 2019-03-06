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

exports.setIo = (i) => {
	io = i;
};

exports.colors = ['primary', 'secondary', 'default', 'accent'];

exports.setConnection = (c) => {
	connection = c;

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
	Queue.belongsToMany(Room, { as: 'Rooms', through: 'queues_rooms', foreignKey: 'queue_id' });
	Room.belongsToMany(Queue, { as: 'Queues', through: 'queues_rooms', foreignKey: 'room_id' });

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
	});
};

exports.get_profile = (id) => Profile.findOne({ where: { id: id } });

exports.get_or_create_profile = (id, user_name, name) => new Promise((resolve, reject) => {
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

exports.get_room = id => Room.findOne({ where: { id: id } });

// ger alla tillgängliga rum och deras tillhörande datorer
exports.get_rooms = () => new Promise((resolve, reject) => {
	Room.findAll().then(rooms => {
		Computer.findAll().then(computers => {
			const result = [];
			
			for (const room of rooms) {
				const computers_in_room = computers.filter(c => c.room_id === room.id).map(c => ({
					id: c.id,
					name: c.name,
					ip: c.ip
				}));
				
				result.push({
					id: room.id,
					name: room.name,
					computers: computers_in_room
				});
			}
			
			resolve(result);
		});
	});
});

exports.get_teachers = () => new Promise((resolve, reject) => {
	Profile.findAll({ where: { teacher: true } }).then(teachers => {
		resolve(teachers);
	});
});

exports.add_teacher = (user_name) => new Promise((resolve, reject) => {
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

exports.remove_teacher = (id) => new Promise((resolve, reject) => {
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

exports.get_queues = () => new Promise((resolve, reject) => {
	Queue.findAll().then(queues => {
		resolve(queues);
	});
});

exports.get_queue = (name_or_id) => /^([0-9]+)$/.test(name_or_id) ? Queue.findOne({ where: { id: parseInt(name_or_id) } }) : Queue.findOne({ where: { name: name_or_id } });

exports.get_or_create_queue = (name) => new Promise((resolve, reject) => {
	Queue.findOrCreate({
		where: { name: name },
		defaults: {
			name : name,
			description: null,
			open: false,
			auto_open: null,
			auto_purge: null,
			force_comment: true,
			force_action: true
		}
	}).spread((queue, created) => {
		if (created) {
			students[queue.id] = [];

			Action.bulkCreate([{
				name: "Help",
				color: "primary",
			 	queue_id: queue.id
			 }, {
				name: "Present",
				color: "accent",
				queue_id: queue.id
			}]).then(() => {
				resolve(queue);
			});
		} else {
			resolve(queue);
		}
	});
});

exports.delete_queue = (queue) => new Promise((resolve, reject) => {
	Queue.destroy({ where: { id: queue.id } }).then(() => {
		delete students[queue.id];

		io.emit('delete_queue', queue.id);

		resolve();
	});
});

exports.get_computer = ip => Computer.findOne({
	where: { ip: ip },
	include: [
		{ model: Room, as: Room.rooms }
	]
});

exports.get_actions = (queue) => new Promise((resolve, reject) => {
	Action.findAll({ where: { queue_id: queue.id } }).then(actions => {
		resolve(actions);
	});
});

exports.get_action_by_id = (id) => {
	if (id === null) {
		return new Promise((resolve, reject) => {
			resolve(null);
		});
	} else {
		return Action.findOne({ where: { id: id } });
	}
}

exports.get_action_by_name = (queue, name) => Action.findOne({ where: { queue_id: queue.id, name: name } });

exports.create_action = (queue, name, color) => new Promise((resolve, reject) => {
	Action.create({
		queue_id: queue.id,
		name: name,
		color: color
	}).then(action => {
		exports.get_actions(queue).then(actions => {
			exports.io_emit_update_queue(queue, { actions: actions });
		});

		resolve(action);
	});
});

exports.delete_action = (queue, action) => new Promise((resolve, reject) => {
	action.destroy().then(() => {
		exports.get_actions(queue).then(actions => {
			// tvinga inte studenterna att välja en action om vi inte längre har några actions
			if (actions.length === 0 && queue.force_action) {
				queue.force_action = false;
				queue.save();

				exports.io_emit_update_queue(queue, { force_action: false });
			}

			io.emit('delete_action', action.id);

			resolve();
		});
	});
});

exports.get_students = queue => students[queue.id];

exports.add_student = (queue, profile, comment, location, action) => {
	students[queue.id].push({
		profile: profile,
		entered_at: Date.now(),
		comment: comment,
		location: location,
		action: action,
		receiving_help_from: null
	});

	exports.io_emit_update_queue_students(queue);
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

		exports.io_emit_update_queue_students(queue);
	} else {
		for (var i = 0; i < s.length; i++) {
			if (s[i].profile.id === move_after) {
				s.splice(i + 1, 0, student);
				break;
			}
		}

		s.splice(remove_index, 1);

		exports.io_emit_update_queue_students(queue);
	}
};

exports.add_room_to_queue = (room, queue) => new Promise((resolve, reject) => {
	room.addQueue(queue).then(() => {
		exports.get_actions(queue).then(actions => {
			exports.io_emit_update_queue(queue, { actions: actions });
		});
		
		resolve();
	});
});

// används för att se om en användare, givet ett köobjekt och användarens ID, har lärar- eller assistenträttigheter i en kö
exports.has_permission = (queue, profile_id) => new Promise((resolve, reject) => {
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

// genväg för att uppdatera klienten om det finns en ny lista på studenter
exports.io_emit_update_queue_students = (queue) => {
	exports.io_emit_update_queue(queue, { students: students[queue.id] });
};

// generellt uppdateringsanrop för klienterna när någonting ändras i en kö
exports.io_emit_update_queue = (queue, changes) => {
	io.emit('update_queue', {
		queue: queue.id,
		changes: changes
	});
};
