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

var serverPort = 8000;
__dirname += "/content";

/*
 *	String.startsWith polyfill
 */
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0;
		return this.indexOf(searchString, position) === position;
	};
}

permitAccessTo("/styles");
permitAccessTo("/scripts");
permitAccessTo("/views");
permitAccessTo("/images");

app.use(logger("dev")); // enable logging

http.listen(serverPort, function(){
	serverLog(1, "Server listening on *:" + serverPort);
});

var chatUsers = {};
var num = 0;

/********************************** ROUTING **********************************/

app.get("/", function(req, res) {
	res.sendFile(__dirname + "/views/index.html");
});

app.get("/chat", function(req, res) {
	res.sendFile(__dirname + "/views/chat.html");
});

/****************************** EVENT HANDLERS *******************************/

io.on("connection", function(socket){
	serverLog(5, "user connected");
  var user = createChatUser(socket);
	chatUsers[user.uin] = user;
  io.sockets.connected[user.socket].emit("connected", user.username);

	socket.on("chat message", function(content, timeStamp) {
		if (content.trim()) {
			serverLog(2, "content: " + content);
			io.emit("chat message", content, user, formTimeStamp(timeStamp));
		}
	});
	socket.on("disconnect", function() {
		serverLog(0, "user disconnected");
	});
});


/***************************** MAIN FUNCTIONS ********************************/

function createChatUser(socket) {
  var colors = [
    "DarkMagenta",
    "DeepPink",
    "Crimson",
    "Black",
    "DarkGreen",
    "Brown",
    "Navy",
    "Blue",
    "Red"
  ];
  var user = {
    "uin": ++num,
    "username": "Anonymous #" + num,
    "color": colors[num % colors.length],
    "connected": formTimeStamp(),
    "socket": socket.id
  };
  serverLog(1, "uin: " + user.uin + " | name: " + user.username + ".");
  serverLog(1, "connected: " + user.connected + "| color: " + user.color);
  return user;
}


/**************************** HELPER FUNCTIONS ******************************/

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

/*
 *  @description: Generates a nicely formatted timestamp.
 *  @param {Date} — A Date object for the Date/Time for which you want a formatted timestamp.
 *  @returns {String} — The formatted timestamp.
 */
function formTimeStamp(sendTime) {
  var time = new Date(sendTime instanceof Date ? sendTime : Date.now());
  var hh   = time.getHours();
  var min  = time.getMinutes();
  var sec  = time.getSeconds();
  var mm   = (min < 10 ? "0" + min : min);
  var ss   = (sec < 10 ? "0" + sec : sec);
  var ts   = "[" + hh + ":" + mm + ":" + ss + "]";
  return ts;
}
