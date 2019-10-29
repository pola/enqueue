'use strict';

const Sequelize = require('sequelize');
const crypto = require('crypto');
const kth = require('./kth-data-fetcher');
const setTimeoutAt = require('safe-timers').setTimeoutAt;

var Queue, Room, Computer, Profile, Action, Booking, Token, Task = null;

var io = null;
var connection = null;
var booking_timer = null;
var queuing = {};
var bookings_vinfo = {};
var timeouts = {};

exports.setIo = (i) => {
	io = i;
};

exports.colors = ['primary', 'secondary', 'default', 'accent'];

exports.setConnection = (c) => {
	connection = c;

	Queue = connection.define('queue', {
		id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		name : Sequelize.STRING,
		description: Sequelize.TEXT,
		open: Sequelize.BOOLEAN,
		force_kthlan: Sequelize.BOOLEAN,
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

	// bokningar
	Booking = connection.define('bookings', {
		id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		external_id: Sequelize.STRING,
		timestamp: Sequelize.BIGINT,
		removal_duration: Sequelize.BIGINT,
		comment: Sequelize.STRING,
		location: Sequelize.STRING
	});	

	// vilken kö varje bokning tillhör
	Booking.belongsTo(Queue, { foreignKey: 'queue_id' });

	// För att koppla studenter till bokningar
	Booking.belongsToMany(Profile, { as: 'BookingStudents', through: 'bookings_students', foreignKey: 'booking_id' });
	Profile.belongsToMany(Booking, { as: 'StudentInBookings', through: 'bookings_students', foreignKey: 'student_id' });
	
	Token = connection.define('tokens', {
		token: { type: Sequelize.STRING, primaryKey: true }
	});
	
	Token.belongsTo(Profile, { foreignKey: 'profile_id' });

	Task = connection.define('tasks', {
		id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		type: Sequelize.STRING,
		data: Sequelize.TEXT,
		deadline: Sequelize.BIGINT
	});

	Task.belongsTo(Queue, { foreignKey: 'queue_id' });

	connection.sync().then(() => {
		Queue.findAll().then(queues => {
			for (const queue of queues) {
				queuing[queue.id] = [];
			}

			Task.findAll().then(tasks => {
				for (const task of tasks) {
					exports.task_update(task);
				}
			});
		});

		exports.remove_expired_bookings();
	});
};

exports.task_timeout = task_id => {
	exports.get_task(task_id).then(task => {
		const queue = task.queue;
		const changes = {};

		switch (task.type) {
			case 'OPEN':
				if (!queue.open) {
					changes.open = true;
					queue.open = true;
				}
				break;

			case 'CLOSE':
				if (queue.open) {
					changes.open = false;
					queue.open = false;
				}
				break;
		}

		if (Object.keys(changes).length > 0) {
			queue.save().then(() => {
				exports.io_emit_update_queue(queue, changes);
			});
		}
		
		exports.remove_task(task);
	});
};

exports.task_update = task => {
	if (task.id in timeouts) {
		timeouts[task.id].clear();
		delete timeouts[task.id];
	}
	
	var duration = task.deadline - Date.now();
	
	if (duration <= 0) {
		exports.task_timeout(task.id);
	} else {
		timeouts[task.id] = setTimeoutAt(exports.task_timeout, task.deadline, task.id);
	}
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

exports.get_profile = id => new Promise((resolve, reject) => {
	Profile.findOne({ where: { id: id } }).then(profile => {
		if (profile !== null) {
			resolve(profile);
		} else {
			kth.from_id(id).then(profile_data => {
				if (profile_data !== null) {
					exports.get_or_create_profile(profile_data.id, profile_data.user_name, profile_data.name).then(new_profile => {
						resolve(new_profile);
					});
				} else {
					resolve(null);
				}
			});
		}
	});
});

exports.get_profile_by_user_name = user_name => new Promise((resolve, reject) => {
	Profile.findOne({ where: { user_name: user_name } }).then(profile => {
		if (profile !== null) {
			resolve(profile);
		} else {
			kth.from_user_name(user_name).then(profile_data => {
				if (profile_data !== null) {
					exports.get_or_create_profile(profile_data.id, profile_data.user_name, profile_data.name).then(new_profile => {
						resolve(new_profile);
					});
				} else {
					resolve(null);
				}
			});
		}
	});
});

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
	Room.findAll({ order: [ ['name', 'ASC'] ] }).then(rooms => {
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

exports.add_teacher = profile => {
	profile.teacher = true;

	profile.save().then(() => {
		exports.get_teachers().then(teachers => {
			io.sockets.emit('teachers', teachers);
		});
	});
};

exports.remove_teacher = profile => {
	profile.teacher = false;

	profile.save().then(() => {
		exports.get_teachers().then(teachers => {
			io.sockets.emit('teachers', teachers);
		});
	});
};

exports.get_queues = () => new Promise((resolve, reject) => {
	Queue.findAll().then(queues => {
		resolve(queues);
	});
});

exports.get_queue = (name_or_id) => Queue.findOne({
	where: (/^([0-9]+)$/.test(name_or_id) ? {
		id: parseInt(name_or_id)
	}:{
		name: name_or_id
	}),
	include: [{
		all: true
	}]
});

exports.get_booking = (queue, booking_id) => Booking.findOne({
	where: {
		id: booking_id,
		queue_id: queue.id
	},
	include: [{
		all: true
	}]
});

exports.get_booking_vinfo = booking => {
	if (bookings_vinfo.hasOwnProperty(booking.id)) {
		return bookings_vinfo[booking.id];
	} else {
		return {
			bad_location: false,
			handlers: []
		};
	}
};

exports.set_booking_bad_location = (booking, bad_location) => {
	if (!bookings_vinfo.hasOwnProperty(booking.id)) {
		bookings_vinfo[booking.id] = {
			bad_location: bad_location,
			handlers: []
		};
	} else {
		bookings_vinfo[booking.id].bad_location = bad_location;
	}

	if (!bad_location && bookings_vinfo[booking.id].handlers.length === 0) {
		delete bookings_vinfo[booking.id];
	}
};

exports.set_booking_handlers = (booking, handlers) => {
	if (!bookings_vinfo.hasOwnProperty(booking.id)) {
		bookings_vinfo[booking.id] = {
			bad_location: false,
			handlers: handlers
		};
	} else {
		bookings_vinfo[booking.id].handlers = handlers;
	}

	if (handlers.length === 0 && !bookings_vinfo[booking.id].bad_location) {
		delete bookings_vinfo[booking.id];
	}
};

exports.get_or_create_queue = (name) => new Promise((resolve, reject) => {
	Queue.findOrCreate({
		where: { name: name },
		defaults: {
			name : name,
			description: null,
			open: false,
			force_kthlan: false,
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

exports.delete_queue = queue => new Promise((resolve, reject) => {
	Queue.destroy({ where: { id: queue.id } }).then(() => {
		delete queuing[queue.id];

		io.emit('delete_queue', queue.id);
		resolve();
	});
});

exports.delete_booking = booking => new Promise((resolve, reject) => {
	booking.destroy().then(() => {
		exports.remove_expired_bookings();

		if (bookings_vinfo.hasOwnProperty(booking.id)) {
			delete bookings_vinfo[booking.id];
		}

		io.emit('delete_booking', booking.id);
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
	Action.findAll({ where: { queue_id: queue.id }, order: [ ['name', 'ASC'] ] }).then(actions => {
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

exports.get_bookings = queue => Booking.findAll({
	where: {
		queue_id: queue.id
	},
	include: [{
		all: true
	}]
});

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

exports.get_tasks = (queue) => new Promise((resolve, reject) => {
	Task.findAll({ where: { queue_id: queue.id }, order: [ ['deadline', 'ASC'], ['id', 'ASC'] ] }).then(tasks => {
		resolve(tasks);
	});
});

exports.get_task = task_id => Task.findOne({ where: { id: task_id }, include: [{ model: Queue }] });

exports.add_task_to_queue = (queue, type, data, deadline) => new Promise((resolve, reject) => {
	Task.create({
		queue_id: queue.id,
		type: type,
		data: JSON.stringify(data),
		deadline: deadline
	}).then(task => {
		exports.task_update(task);

		exports.io_emit_to_assistants(queue, 'add_task', {
			queue: queue.id,
			task: {
				id: task.id,
				type: task.type,
				data: JSON.parse(task.data),
				deadline: task.deadline
			}
		});

		resolve(task);
	});
});

exports.remove_task = task => new Promise((resolve, reject) => {
	if (task.id in timeouts) {
		timeouts[task.id].clear();
		delete timeouts[task.id];
	}

	task.destroy().then(() => {
		exports.io_emit_to_assistants(task.queue, 'remove_task', {
			queue: task.queue.id,
			task: task.id
		});

		resolve();
	});
});

exports.create_booking = (queue, external_id, timestamp, removal_duration, comment, location, students) => new Promise((resolve, reject) => {
	Booking.create({
		queue_id: queue.id,
		external_id: external_id,
		timestamp: timestamp,
		removal_duration: removal_duration,
		comment: comment,
		location: location
	}).then(booking_lazy => {
		booking_lazy.setBookingStudents(students).then(() =>{
			Booking.findOne({
				where: { id: booking_lazy.id },
				include: [{ all: true }]
			}).then(booking => {
				exports.remove_expired_bookings();
				resolve(booking);
			});
		});
	});
});

exports.remove_expired_bookings = () => {
	clearTimeout(booking_timer);

	Booking.findAll({
		where: {
			removal_duration: {
				[Sequelize.Op.ne]: null
			}
		}
	}).then(bookings => {
		var smallest_not_expired = null;
		const now = Date.now();

		const expired = [];

		for (const booking of bookings) {
			const expiration = booking.timestamp + booking.removal_duration;

			if (expiration <= now) {
				expired.push(booking.id);
			} else if (smallest_not_expired === null || smallest_not_expired > expiration) {
				smallest_not_expired = expiration;
			}
		}

		if (expired.length > 0) {
			Booking.destroy({
				where: {
					id: expired
				}
			}).then(() => {
				for (var id of expired) {
					if (bookings_vinfo.hasOwnProperty(id)) {
						delete bookings_vinfo[id];
					}
	
					io.emit('delete_booking', id);
				}
			});
		}
		
		if (smallest_not_expired !== null) {
			booking_timer = setTimeout(exports.remove_expired_bookings, smallest_not_expired - now);
		} else {
			booking_timer = null;
		}
	});
};

exports.get_students = raw_list => new Promise((resolve, reject) => {
	const where_id = [];
	const where_user_name = [];

	for (const raw_item of raw_list) {
		if (typeof raw_item !== 'object' || (raw_item.hasOwnProperty('id') && raw_item.hasOwnProperty('user_name'))) {
			resolve(null);
			return;
		}

		if (raw_item.hasOwnProperty('id')) {
			where_id.push(raw_item.id);
		} else if (raw_item.hasOwnProperty('user_name')) {
			where_user_name.push(raw_item.user_name);
		} else {
			resolve(null);
			return;
		}
	}

	Profile.findAll({
		where: {
			[Sequelize.Op.or]: {
				id: {
					[Sequelize.Op.in]: where_id
				},
				user_name: {
					[Sequelize.Op.in]: where_user_name
				}
			}
		}
	}).then(profiles => {
		for (var one_id of where_id) {
			if (profiles.findIndex(x => x.id === one_id) === -1) {
				resolve(null);
				return;
			}
		}

		for (var one_user_name of where_user_name) {
			if (profiles.findIndex(x => x.user_name === one_user_name) === -1) {
				resolve(null);
				return;
			}
		}

		resolve(profiles);
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
exports.io_emit_update_queue = (queue, changes) => {
	const message_user = {
		queue: queue.id,
		changes: changes
	};

	const changes_clone = JSON.parse(JSON.stringify(changes));

	const message_guest = {
		queue: queue.id,
		changes: changes_clone
	};

	if (changes.hasOwnProperty('queuing')) {
		message_guest.changes.queuing = changes_clone.queuing.map(x => {
			x.profile.user_name = null;
			x.profile.name = null;

			return x;
		});
	}

	for (const k of Object.keys(io.sockets.sockets)) {
		const socket = io.sockets.sockets[k];
		socket.emit('update_queue', socket.handshake.session.hasOwnProperty('profile') ? message_user : message_guest);
	}
};

// generellt uppdateringsanrop för klienterna när en specifik student ändras i en kö (t.ex. en student får hjälp)
exports.io_emit_update_queue_queuing_student = (queue, student) => {
	const message_user = {
		queue: queue.id,
		student: student
	};

	const student_clone = JSON.parse(JSON.stringify(student));

	const message_guest = {
		queue: queue.id,
		student: student_clone
	};

	message_guest.student.profile = {
		id: student_clone.profile.id,
		user_name: null,
		name: null
	};

	for (const k of Object.keys(io.sockets.sockets)) {
		const socket = io.sockets.sockets[k];
		socket.emit('update_queue_queuing_student', socket.handshake.session.hasOwnProperty('profile') ? message_user : message_guest);
	}
}

exports.io_emit_to_assistants = (queue, key, message) => {
	queue.getAssistants().then(assistants => {
		const ids = assistants.map(a => a.id);

		for (const k of Object.keys(io.sockets.sockets)) {
			const socket = io.sockets.sockets[k];
			
			if (socket.handshake.session.hasOwnProperty('profile') && (socket.handshake.session.profile.teacher || ids.includes(socket.handshake.session.profile.id))) {
				socket.emit(key, message);
			}
		}
	});
};

exports.io_emit_update_booking = (queue, nice_booking) => {
	const message_user = {
		queue: queue.id,
		booking: nice_booking
	};

	const booking_clone = JSON.parse(JSON.stringify(nice_booking));

	booking_clone.students = booking_clone.students.map(x => ({
		id: x.id,
		user_name: null,
		name: null
	}));

	const message_guest = {
		queue: queue.id,
		booking: booking_clone
	};

	for (const k of Object.keys(io.sockets.sockets)) {
		const socket = io.sockets.sockets[k];
		socket.emit('update_booking', socket.handshake.session.hasOwnProperty('profile') ? message_user : message_guest);
	}
};