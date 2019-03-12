/* jslint node: true */
"use strict";

const Sequelize = require('sequelize');
const crypto = require('crypto');

var Queue = null;
var Room = null;
var Computer = null;
var Profile = null;
var Action = null;
var Token = null;

var io = null;
var connection = null;
var locked_time_slots = {};
var queuing = {};

exports.setIo = (i) => {
	io = i;
};

exports.colors = ['primary', 'secondary', 'default', 'accent'];

exports.setConnection = (c) => {
	connection = c;

	Queue = connection.define('queue', {
		id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
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
		name: Sequelize.STRING
	});

	// För att koppla köer till rum
	Queue.belongsToMany(Room, { as: 'Rooms', through: 'queues_rooms', foreignKey: 'queue_id' });
	Room.belongsToMany(Queue, { as: 'Queues', through: 'queues_rooms', foreignKey: 'room_id' });

	Computer = connection.define('computer', {
		id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		name: Sequelize.STRING,
		ip: Sequelize.STRING
	});

	// För att koppla datorer till rum
	Computer.belongsTo(Room, { foreignKey: 'room_id' });

	Profile = connection.define('profile', {
		id: { type: Sequelize.STRING, primaryKey: true }, // u1-numret
		user_name: Sequelize.STRING,
		name: Sequelize.STRING,
		teacher: Sequelize.BOOLEAN
	});

	// För att koppla assistenter till köer
	Queue.belongsToMany(Profile, { as: 'Assistants', through: 'queues_assistants', foreignKey: 'assistant_id' });
	Profile.belongsToMany(Queue, { as: 'AssistantInQueues', through: 'queues_assistants', foreignKey: 'queue_id' });

	// För att koppla vitlistade studenter till köer
	Queue.belongsToMany(Profile, { as: 'Students', through: 'queues_students', foreignKey: 'student_id' });
	Profile.belongsToMany(Queue, { as: 'StudentInQueues', through: 'queues_students', foreignKey: 'queue_id' });

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
	
	Token = connection.define('tokens', {
		token: { type: Sequelize.STRING, primaryKey: true }
	});
	
	Token.belongsTo(Profile, { foreignKey: 'profile_id' });

	connection.sync().then(() => {
		Queue.findAll().then(queues => {
			for (const queue of queues) {
				queuing[queue.id] = [];
			}
		});
	});
};

exports.validate_token = token => Token.findOne({
	where: { token: token },
	include: [{
		model: Profile,
		as: Profile.profiles
	}]
});

exports.create_token = profile_id => Token.create({
	token: crypto.randomBytes(32).toString('hex'),
	profile_id: profile_id
});

exports.get_profile = id => Profile.findOne({ where: { id: id } });

exports.get_profile_by_user_name = (user_name) => Profile.findOne({ where: { user_name: user_name } });

exports.get_or_create_profile = (id, user_name, name) => new Promise((resolve, reject) => {
	Profile.findOrCreate({
		where: { id: id },
		defaults: {
			id: id,
			user_name: user_name === null ? id : user_name,
			name: name === null ? id : name,
			teacher: false
		}
	}).spread((profile, created) => {
		var changed = false;
		
		if (!created) {
			if (user_name !== null && profile.user_name !== user_name) {
				profile.user_name = user_name;
				changed = true;
			}
			
			if (name !== null && profile.name !== name) {
				profile.name = name;
				changed = true;
			}
		}
		
		if (changed) {
			profile.save().then(() => {
				resolve(profile);
			})
		} else {
			resolve(profile);
		}
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

exports.get_teachers = () => Profile.findAll({ where: { teacher: true } });

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
			queuing[queue.id] = [];

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
		delete queuing[queue.id];

		io.emit('delete_queue', queue.id);

		resolve();
	});
});

exports.get_computer = ip => Computer.findOne({
	where: { ip: ip },
	include: [{
		model: Room,
		as: Room.rooms
	}]
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

			exports.io_emit_update_queue(queue, { actions: actions.map(a => ({
				id: a.id,
				name: a.name,
				color: a.color
			}))});

			resolve();
		});
	});
});

exports.get_queuing = queue => queuing[queue.id];

exports.add_student = (queue, profile, comment, location, action) => {
	queuing[queue.id].push({
		profile: profile,
		entered_at: Date.now(),
		comment: comment,
		location: location,
		action: action,
		bad_location: false,
		handlers: []
	});

	exports.io_emit_update_queuing(queue);
};

exports.move_student_after = (queue, student, move_after) => {
	const s = exports.get_queuing(queue);
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

		exports.io_emit_update_queuing(queue);
	} else {
		for (var i = 0; i < s.length; i++) {
			if (s[i].profile.id === move_after) {
				s.splice(i + 1, 0, student);
				break;
			}
		}

		s.splice(remove_index, 1);

		exports.io_emit_update_queuing(queue);
	}
};

exports.add_room_to_queue = (room, queue) => new Promise((resolve, reject) => {
	room.addQueue(queue).then(result => {
		if (result.length === 0) {
			resolve(false);
		} else {
			// uppdatera klienterna med den nya rumslistan via websockets
			queue.getRooms().then(rooms => {
				exports.io_emit_update_queue(queue, {
					rooms: rooms.map(r => ({
						id: r.id,
						name: r.name
					})
				)});
			});
		
			resolve(true);
		}
	});
});

exports.remove_room_from_queue = (room, queue) => new Promise((resolve, reject) => {
	room.removeQueue(queue).then(result => {
		if (result === 0) {
			resolve(false);
		} else {
			// uppdatera klienterna med den nya rumslistan via websockets
			queue.getRooms().then(rooms => {
				exports.io_emit_update_queue(queue, {
					rooms: rooms.map(r => ({
						id: r.id,
						name: r.name
					})
				)});
			});
		
			resolve(true);
		}
	});
});

exports.add_student_to_queue = (student, queue) => new Promise((resolve, reject) => {
	student.addStudentInQueue(queue).then(result => {
		if (result.length === 0) {
			resolve(false);
		} else {
			// TODO: skicka bara den här uppdateringen till assistenter, lärare och studenten själv
			queue.getStudents().then(students => {
				exports.io_emit_update_queue(queue, { students: students });
			});
		
			resolve(true);
		}
	});
});

exports.remove_student_from_queue = (student, queue) => new Promise((resolve, reject) => {
	student.removeStudentInQueue(queue).then(result => {
		if (result === 0) {
			resolve(false);
		} else {
			// TODO: skicka bara den här uppdateringen till assistenter, lärare och studenten själv
			queue.getStudents().then(students => {
				exports.io_emit_update_queue(queue, { students: students });
			});
		
			resolve(true);
		}
	});
});

exports.add_assistant_to_queue = (assistant, queue) => new Promise((resolve, reject) => {
	assistant.addAssistantInQueue(queue).then(result => {
		if (result.length === 0) {
			resolve(false);
		} else {
			queue.getAssistants().then(assistants => {
				exports.io_emit_update_queue(queue, { assistants: assistants });
			});
		
			resolve(true);
		}
	});
});

exports.remove_assistant_from_queue = (assistant, queue) => new Promise((resolve, reject) => {
	assistant.removeAssistantInQueue(queue).then(result => {
		if (result === 0) {
			resolve(false);
		} else {
			queue.getAssistants().then(assistants => {
				exports.io_emit_update_queue(queue, { assistants: assistants });
			});
		
			resolve(true);
		}
	});
});

// används för att se om en användare, givet ett köobjekt och användarens ID, har lärar- eller assistenträttigheter i en kö
exports.has_permission = (queue, profile_id) => new Promise((resolve, reject) => {
	if (profile_id === null) {
		resolve(false);
	} else {
		Profile.findOne({ where: { id: profile_id }}).then(profile => {
			if (profile.teacher) {
				resolve(true);
				return;
			}

			profile.hasAssistantInQueue(queue).then(result => {
				resolve(result);
			});
		});
	}
});

// genväg för att uppdatera klienten om det finns en ny lista på studenter
exports.io_emit_update_queuing = (queue) => exports.io_emit_update_queue(queue, { queuing: queuing[queue.id] });

// generellt uppdateringsanrop för klienterna när någonting ändras i en kö
exports.io_emit_update_queue = (queue, changes) => io.emit('update_queue', {
	queue: queue.id,
	changes: changes
});

exports.io_emit_update_queue_queuing_student = (queue, student) => io.emit('update_queue_queuing_student', {
	queue: queue.id,
	student: student
});
