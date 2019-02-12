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
    queuing: Sequelize.JSON // lista av personerna i kön
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
    name : Sequelize.STRING
  });

  // För att koppla datorer till rum
  Computer.belongsTo(Room, { foreignKey: 'room_id' });

  Profile = connection.define('profile', {
    id: { type: Sequelize.STRING, primaryKey: true}, // u1-numret
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

  connection.sync();
};

exports.get_assistants = () => {
	return new Promise(function(resolve, reject) {
    TimeSlot.findAll().then(time_slots => {
      Assistant.findAll().then(assistants => {
        var result = [];
        var i = 1;

        for (var assistant of assistants) {
          var assistant_time_slots = [];

          for (var time_slot of time_slots) {
            if (time_slot.assistantId == assistant.id) {
              assistant_time_slots.push(time_slot);
            }
          }

          result.push({
            id: assistant.id,
            name: assistant.name,
            time_slots: assistant_time_slots
          });
        }

        resolve(result);
      });
    });
  });
};

exports.get_assistant = (id) => {
	return new Promise(function(resolve, reject) {
    Assistant.findAll( { where : { id : id } } ).then( assistant => {
      TimeSlot.findAll( { where : { assistantId : id } } ).then( time_slots => {
         resolve({
           id: assistant[0].id,
           name: assistant[0].name,
           time_slots: time_slots
         });
      });
    });
	});
};

exports.get_admins = () => {
	return new Promise(function(resolve, reject) {
    Assistant.findAll().then(assistants => {
      resolve(assistants);
    });
	});
};

exports.remove_time_slot = (id) => {
	exports.unlock_time_slot(id);

	return new Promise(function(resolve, reject) {
    TimeSlot.destroy({ where: {id: id }}).then(what_is_this => {
      resolve(true);
    });
	});
};

exports.create_time_slot = (id, time) => {
	return new Promise(function(resolve, reject) {
    TimeSlot.create({
      assistantId: id,
      time: time
    }).then(time_slot => {
      resolve(time_slot);
    });
	});
};

var time_slot_expire = function(id) {
	exports.unlock_time_slot(id);
	io.sockets.emit('unlock', id);
};

exports.is_time_slot_locked = (id) => {
	return id in locked_time_slots;
};

exports.lock_time_slot = (id) => {
	id = parseInt(id);
	if (!exports.is_time_slot_locked(id)) {
		locked_time_slots[id] = setTimeout(time_slot_expire, 20000, id);
	}
};

exports.unlock_time_slot = (id) => {
	id = parseInt(id);

	if (exports.is_time_slot_locked(id)) {
		clearTimeout(locked_time_slots[id]);
		delete locked_time_slots[id];
	}
};

exports.book_time_slot = (id, name) => {
	id = parseInt(id);
	exports.unlock_time_slot(id);
  TimeSlot.update({ booked_by: name }, { where: { id : id } });
}
