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

/*
 *	String.startsWith polyfill
 */
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0;
		return this.indexOf(searchString, position) === position;
	};
}

permitAccessTo("content");
permitAccessTo("content/css");
permitAccessTo("content/scripts");
permitAccessTo("content/views");
permitAccessTo("content/images");

app.use(logger("dev")); // enable logging

http.listen(serverPort, function(){
	serverLog(1, "Server listening on *:" + serverPort);
});

var users = {};

/********************************** ROUTING **********************************/

app.get("/", function(req, res) {
	res.sendFile(__dirname + "/content/views/index.html");
});

app.get("/chat", function(req, res) {
	res.sendFile(__dirname + "/content/views/chat.html");
});

/****************************** EVENT HANDLERS *******************************/

io.on("connection", function(socket){
	serverLog(5, "user connected");
	//users[user.uin] = user;
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
