/*
 * Neighbor nodejs server/routing backend
 * Date: October 18, 2015
 *
 */

var express = require("express");
var app = express();
var server = require("http").Server(app);
var https = require("https");
var io = require("socket.io")(server);
var logger = require("morgan");
var chalk = require("chalk");
var qs = require("querystring");
var fs = require("fs");
var bodyParser = require("body-parser");

var SERVER_PORT = 8000;
var CAPTCHA_SERVER_SECRET = "";


/*
 *	String.startsWith polyfill
 */
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position) {
		position = position || 0;
		return this.indexOf(searchString, position) === position;
	};
}

permitAccessTo("/content/styles");
permitAccessTo("/content/scripts");
permitAccessTo("/content/views");
permitAccessTo("/content/images");

app.use(logger("dev")); // enable logging

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended": true}));

server.listen(SERVER_PORT, function(){
	// hostname unspecified here assumes 0.0.0.0, i.e. all IP's, so putting *.
	serverLog(1, "Server listening on *:" + SERVER_PORT);
});

var chatUsers = {};
var num = 0;

/********************************** ROUTING **********************************/

app.get("/", function(req, res) {
	res.sendFile(__dirname + "/content/views/main.html");
});

app.get(/\/styles\/(.*)/, function(req, res) {
  res.sendFile(__dirname + "/content/styles/" + req.params[0]);
});

app.get(/\/scripts\/(.*)/, function(req, res) {
  res.sendFile(__dirname + "/content/scripts/" + req.params[0]);
});

app.get(/\/images\/(.*)/, function(req, res) {
  res.sendFile(__dirname + "/content/images/" + req.params[0]);
});

app.get("/chat", function(req, res) {
	res.sendFile(__dirname + "/content/views/chat.html");
});

app.get("/weblog", function(req, res) {
  res.sendFile(__dirname + "/content/views/blog.html");
});

app.post("/contact", function(req, res) {
  var name = req.body.name;
  var email = req.body.email;
  var msg = req.body.msg;
  var cliCaptcha = req.body.cap;
  //serverLog(1, "request body: " + JSON.stringify(req.body));
  if (name.trim() && msg.trim() && email.trim() && cliCaptcha.trim()) {
    var postData = "";
    var options = {
      "hostname": "www.google.com",
      "method": "POST", // LITERALLY FUCKING RETARDED; this isn't a post request. make up your mind, google.
      "port": 443,
      "path": "/recaptcha/api/siteverify?secret="+CAPTCHA_SERVER_SECRET+"&response="+cliCaptcha
    }
	  var serCaptcha = https.request(options, function(response) {
      var result = "";
      response.on("error", minorError);
      response.on("data", function(chunk) {
        result += chunk;
      });
      response.on("end", function() {
        try {
          var jason = JSON.parse(result);
          if (jason.success) {
            var time = new Date();
            var info = ("" + time).split(" ").slice(1, -2);
            var dir = __dirname + "/messages/" +info[1] + "_" + info[0] + "_" + info[2]; // day_monthName_year/
            var file = "/" + name + "_" + info[3]; // name_timestamp
            fs.existsSync(dir) || fs.mkdirSync(dir);
            fs.writeFile(dir + file, msg+"\n", "utf8", function(err) {
              if (err) {
                minorError("File write error: " + err);
                res.sendStatus(409); // Conflict error, maybe try resubmitting...
              } else {
                serverLog(4, name + " sent you a message, it has been recorded at " + (dir + file));
                res.sendStatus(200); // Success!
              }
            });
          } else {
            serverLog(-1, "captcha failure: " + jason.success);
          }
        } catch(e) {
          minorError("Caught error: " + e);
        }
      });
	  });
	  serCaptcha.end(postData);
  } else {
    serverLog(0, "empty message sent: " + name + " " + email + " " + msg);
    res.sendStatus(400) // bad request error, modify your request
  }
});

/****************************** EVENT HANDLERS *******************************/

io.on("connection", function(socket){
	serverLog(5, "user connected");
  var user = createChatUser(socket);
	chatUsers[user.socket] = user;
  io.sockets.connected[user.socket].emit("connected", user.username);

	socket.on("chat message", function(content, timeStamp) {
		if (content.trim()) {
			serverLog(2, "content: " + content);
			io.emit("chat message", content, user, formTimeStamp(timeStamp));
		}
	});

  socket.on("chat setName", function(desired) {
    var cool = false;
    if (!/Anonymous\s*#\d.*/.test(desired) && !/.*Masq.*Chat.*/.test(desired)){
      if (desired.length <= 20) {
        cool = true;
        serverLog(5, "user " + user.username + " successfully changed their name to \"" + desired + "\"");
        chatUsers[user.socket].username = desired;
      }
    }
    if (!cool) {
      serverLog(0, "user " + user.username + " attempted to change their name to \"" + desired + "\"");
    }
    io.sockets.connected[user.socket].emit("chat setName", cool, desired);
  });

  socket.on("contactMessage", function(details) {
    serverLog(1, details.a + "\n" + details.b + "\n" + details.c);
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
    "username": "Anonymous #" + ++num,
    "color": colors[num % colors.length],
    "connected": formTimeStamp(),
    "socket": socket.id
  };
  serverLog(1, "socket: " + user.socket + " | name: " + user.username + ".");
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
	serverLog(-1, "" + message);
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
