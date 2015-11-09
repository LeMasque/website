/*
 * Neighbor nodejs server/routing backend
 * Date: October 18, 2015
 *
 */

var express = require("express");
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var logger = require("morgan");
var chalk = require("chalk");

/*
 *	String.startsWith polyfill
 */
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0;
		return this.indexOf(searchString, position) === position;
	};
}

/*
 *	Number.toRad polyfill
 */
if (!Number.prototype.toRad) {
	Number.prototype.toRad = function() {
		return this * (Math.PI / 180);
	};
}

permitAccessTo("css");
permitAccessTo("scripts");
permitAccessTo("view");
permitAccessTo("images");

app.use(logger("dev")); // enable logging

http.listen(8080, function(){
	console.log('program listening on *:8080');
});

var users = {};
var queue = [];
var rooms = {};

/********************************** ROUTING **********************************/

app.get('/', function(req, res) {
	res.sendFile(__dirname + "/view/index.html");
});

app.get("/loading", function(req, res) {
	res.sendFile(__dirname + "/view/loading.html");
});

app.get('/chat', function(req, res) {
	res.sendFile(__dirname + "/view/chat.html");
});

/****************************** EVENT HANDLERS *******************************/

io.on('connection', function(socket){
	serverLog(5, "user connected");
	var user = initUser(socket);
	users[user.uin] = user;
	socket.on("location", function(coords) {
		serverLog(1, "coords passed length: " + Object.keys(coords).length);
		if (coords) {
			for (var key in coords) {
				serverLog(-2, "coords[" + key + "]: " + coords[key]);
			}
			serverLog(4, "got location...");
			users[user.uin].lat = coords.latitude;
			users[user.uin].lon = coords.longitude;
			users[user.uin].mms = Date.now();
			users[user.uin].qInd = queue.length - 1;
			matchmaker(users[user.uin]);
		}
	});
	socket.on("next", function(currentRoomId) {
		serverLog(1, "next button pressed");
		var uin = users[rooms[currentRoomId].user1].uin;
		users[uin].mms = Date.now();
		users[uin].qInd = queue.length - 1;
		matchmaker(users[uin]);
		uin = users[rooms[currentRoomId].user2].uin;
		users[uin].mms = Date.now();
		users[uin].qInd = queue.length - 1;
		matchmaker(users[uin]);
	});
	socket.on("chat message", function(content) {
		if (content.trim()) {
			serverLog(2, "content: " + content);
			io.emit("chat message", content);
		}
	});
	socket.on("disconnect", function() {
		serverLog(0, "user disconnected");
	});
});


/***************************** MAIN FUNCTIONS ********************************/

/*
 *	This function returns the most relevant user to connect to, given a userObject
 */
function match(userObj) {
	var closest_user = null;
	var closest_dist = -1; // initialize to negative distance -- i.e. impossible value
	var match_index  = -1;
	var q   = queue;
	var len = q.length;

	for (var i = 0; i < len; i++) {
		var potentialMatch = q[len - 1 - i];
		var dist = coordDistance(userObj.lat, userObj.lon, potentialMatch.lat, potentialMatch.lon);
		serverLog(2, "dist: " + dist);
		if (dist < closest_dist || ((closest_dist < 0) && dist > closest_dist)) { 
			closest_dist = dist;
			closest_user = potentialMatch;
			match_index  = len - 1 - i;
			serverLog(1, "dist found");
		}
	}
	if (closest_dist < 0) {
		serverLog(0, "no users found");
		queue.push(users[userObj.uin]);
		return null;
	} else {
		var roomID = guid();
		serverLog(2, "room generated");
		users[userObj.uin].room = roomID;
		users[closest_user.uin].room = roomID;
		queue.splice(match_index, 1);  // if someone got removed, i could remove wrong person here :/
		rooms[roomID] = {
			"user1": userObj,
			"user2": users[closest_user]
		}
		return closest_user;
	}
}

function initUser(sock) {
	return {
		"lat": null,  // user's latitude
		"lon": null,  // user's longitude
		"uin": generateUin(),  // user's unique id number
		"room": null,  // roomID
		"sock": sock,   // user's socket
		"qInd": null
	};
}

/**************************** HELPER FUNCTIONS ******************************/

/*
 *	Emits matched or notMatched events to clients upon matchmaking success/failure.
 */
function matchmaker(userObj) {
	var matched_user = match(userObj);
	if (matched_user) {
		serverLog(3, "emitting roomID");
		io.sockets.connected[userObj.sock.id].emit("matched", users[userObj.uin].room);
		io.sockets.connected[matched_user.sock.id].emit("matched", matched_user.room);
	} else {
		serverLog(0, "no matches");
		io.sockets.connected[userObj.sock.id].emit("notMatched");
	}
}

/*
 *	Determines distance between two coordinate points
 */ 
function coordDistance(lat1, lon1, lat2, lon2) {
	var R = 6371;
	var dLat = (lat2 - lat1).toRad();
	var dLon = (lon2 - lon1).toRad();
	lat1 = lat1.toRad();
	lat2 = lat2.toRad();

	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c;
}

/*
 * Generate roomID
 */
function guid() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000) .toString(16) .substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

/*
 *	Generate Unique identification numbers 
 *	TODO: make better???
 */
function generateUin() {
	return "naybr_" + Math.random().toFixed(8).toString(10).replace(".", "");
}

/*
 *	Adds access to a given directory to be able to be "GETted"
 */
function permitAccessTo(path) {
	if (typeof path === "string") {
		if (!path.startsWith("/")) {
			path = "/" + path;
		}
		app.use(path, express.static(__dirname + path));
	} else {
		badType("permitAccessTo", path, "string");
	}
}

/*
 *	Use me to create awesome logs
 *	TODO: use extra if it exists
 */
function serverLog(type, message, extra) {
	var okay = true;
	if (typeof type !== "number") {
		badType("serverLog", type, "number");
		okay = false;
	}
	if (typeof message !== "string") {
		badType("serverLog", message, "string");
		okay = false;
	}
	var output = [
		function(msg) { return chalk.bgRed("[-] " + msg); },   // -2 
		function(msg) { return chalk.red("[-] " + msg); },     // -1
		function(msg) { return chalk.yellow("[!] " + msg); },  //  0
		function(msg) { return chalk.cyan("[*] " + msg); },    //  1
		function(msg) { return chalk.magenta("[*] " + msg); }, //  2
		function(msg) { return ("[*] " + msg); },              //  3
		function(msg) { return chalk.inverse("[*] " + msg); }, //  4
		function(msg) { return chalk.green("[+] " + msg); }    //  5
	];
	var outputtedMsg = output[type + 2](message);
	if (type < 0 ) {
		console.error(outputtedMsg);
	} else {
		console.log(outputtedMsg);
	}
}

/*
 *	Call me if there is a warning but not an error
 */
function warn(message) {
	serverLog(0, message);
}

/*
 *	Call me if there was a problem but you don't need to kill the server.
 */ 
function minorError(message) {
	serverLog(-1, message);
}

/*
 *	Call me if a problem requires breaking the program
 */
function majorError(message) {
	serverLog(-2, message);
	if (!(message instanceof Error)) {
		message = Error(message);
	} 
	message.stack();
	throw message;
}

/*
 *	Call me if someone passed a bad variable type to your function
 */
function badType(fName, thing, expected) {
	var blah = fName + " type mismatch; a " + typeof thing + " was provided ";
	blah += "-- expected a " + expected;
	serverLog(-1, blah);
}
