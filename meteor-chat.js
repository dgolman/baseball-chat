Messages = new Meteor.Collection("messages");
Rooms = new Meteor.Collection("rooms");

if (Meteor.isClient) {
  Meteor.subscribe("rooms");
  Meteor.subscribe("messages");

  Template.input.events({
    'click .sendMsg': function(e) {
      var el = document.getElementById("msg");
      if(el.value.trim() != "") {
        sendMessage(el);
      }
    },
    'keyup #msg': function(e) {
      if (e.type == "keyup" && e.which == 13) {
        var el = document.getElementById("msg");
        if(el.value.trim() != "") {
          sendMessage(el);
        }
      }
    }
  });

  Template.chat.events({
    'click .leaveChat': function(e) {
      var result = confirm("Leaving room");
      if (result == true) {
          _leaveChat(Session.get("roomname"));
      } 
    },
  });

  _leaveChat = function(room) {
    Session.clear();
    _sendMessage("Your match has left the room... This chat will be deleted on refresh.");
    var _id = Rooms.findOne({roomname: room})._id;
    console.log(Rooms.findOne({roomname: room}));
    Rooms.remove(_id);
  };

  sendMessage = function(el) {
      var message = _getMessage(el);
      _sendMessage(message);
      $('#messages').animate({
        scrollTop: $('#messages').get(0).scrollHeight
      }, 0);
       _clearMessage(el);
  }

  _sendMessage = function(message) {
    Messages.insert({user: Session.get("attribute"), msg: message, ts: new Date(), room: Session.get("roomname")});
  };

  _getMessage = function(el) {
    return el.value;
  }

  _clearMessage = function(el) {
    el.value = "";
    el.focus();
  }

  _findPitcher = function() {
      var count = Rooms.find({}).count();
      var roomsWithPitcher = Rooms.find({roomtype: "hasPitcher"});

      if(roomsWithPitcher.count() === 0) {
        room = count + 1;
        Meteor.call("clearMessages", room);
        Session.setPersistent("roomname", room);
        Meteor.call("addRoom", {
          roomname: room,
          roomtype: "hasListener",
          createdAt: new Date()
        });
        _sendMessage("Waiting on pitcher...");
      } else {
        // Match with pitcher
        var matchedRoom = Rooms.findOne({roomname: count, roomtype: "hasPitcher"});
        Rooms.update(matchedRoom._id, { $set: {roomtype: "matched"}});
        Session.setPersistent("roomname", matchedRoom.roomname);
        _sendMessage("Connected. Say Hi!");
      }
      Session.setPersistent("attribute", "Listener");
  };

  _findListener = function() {
    var count = Rooms.find({}).count();
    var roomsWithListener = Rooms.find({roomtype: "hasListener"});

    if(roomsWithListener.count() === 0) {
      room = count + 1;
      Meteor.call("clearMessages", room);
      Session.setPersistent("roomname", room);
      Meteor.call("addRoom", {
        roomname: room,
        roomtype: "hasPitcher",
        createdAt: new Date()
      });
      _sendMessage("Waiting on listener...");
    } else {
      // Match with Listener
      var matchedRoom = Rooms.findOne({roomname: count, roomtype: "hasListener"});
      Rooms.update(matchedRoom._id, { $set: {roomtype: "matched"}});
      Session.setPersistent("roomname", matchedRoom.roomname);
      _sendMessage("Connected. Say Hi!");
    }
    Session.setPersistent("attribute", "Pitcher");
  };

  Template.main.helpers({
    rooms: function() {
      return Rooms.find({roomtype: "matched"});
    },
    roomCount: function() {
      return Rooms.find({roomtype: "matched"}).count();
    },
    pitchers: function() {
      return Rooms.find({roomtype: "hasPitcher"}).count();
    },
    listeners: function() {
      return Rooms.find({roomtype: "hasListener"}).count();
    }
  });

  Template.messages.helpers({
    messages: function() {
      return Messages.find({room: Session.get("roomname")}, {sort: {ts: +1}});
    },
	  roomname: function() {
      return Session.get("roomname");
    }
  });
  
  Template.message.helpers({
    timestamp: function() {
      return this.ts.toLocaleString();
    }
  });

  Template.rooms.events({
    'click li': function(e) {
      Session.setPersistent("roomname", e.target.innerText);
    }
  });

  Template.main.events({
    'click .pitch': function(e) {
       _findBatter();
    },
    'click .swing': function(e) {
       _findPitcher();
    }
  })
  
  Template.rooms.helpers({
    rooms: function() {
      return Rooms.find({roomtype: "matched"});
    }
  });
  
  Template.room.helpers({
	  roomstyle: function() {
      return Session.equals("roomname", this.roomname) ? "font-weight: bold" : "";
    }
  });

  Template.chat.helpers({
    release: function() {
      return Meteor.release;
    },
    roomSet: function() {
      return Session.get("roomname");
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    Messages.remove({});
    Rooms.remove({});
    // if (Rooms.find({roomtype: "matched"}).count() === 0) {
    //   // ["No Rooms"].forEach(function(r) {
    //   //   Rooms.insert({roomname: r});
    //   // });
    // }
  });
  
  Rooms.allow({
    insert: function (userId, doc) {
      return true;
    },
    update: function (userId, doc, fieldNames, modifier) {
      return true;
    },
    remove: function (userId, doc) {
      return true;
    }
  });
  // Messages.deny({
  //   insert: function (userId, doc) {
  //     return (userId !== null);
  //   },
  //   update: function (userId, doc, fieldNames, modifier) {
  //     return true;
  //   },
  //   remove: function (userId, doc) {
  //     return true;
  //   }
  // });
  Messages.allow({
    insert: function (userId, doc) {
      return true;
    }
  });

  Meteor.methods({
    addRoom: function (room) {
      Rooms.insert(room);
    },
    clearMessages: function(room) {
      Messages.remove({room: room});
    },
    deleteRoom: function (taskId) {
      //If room is there too long without chat activity.
    }
  });
  
  Meteor.publish("rooms", function () {
    return Rooms.find();
  });
  Meteor.publish("messages", function () {
    return Messages.find({}, {sort: {ts: +1}});
  });
}
