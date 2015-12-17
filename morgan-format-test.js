/**
 *
 *
 */

var morgan = require("morgan");
var chalk = require("chalk");
var express = require("express");
var app = express();
var http = require('http').Server(app);
var serverPort = 8000;

var format = "[:thing[_startTime]]\: :thing[_remoteAddress] - :thing[ip] ; ";
format += ":thing[method] :thing[url] HTTP/:http-version :thing[statusCode] : ";
format += ":response-time ms";

app.use(morgan(format));

app.get("/", function(resquest, response) {
  response.end("Hello World");
});

http.listen(serverPort, function(){
	console.log(1, "Server listening on *:" + serverPort);
});

function herp(something) {
  //console.log("herp: " + something + " => type: " + typeof something);
  return chalk.red("" + something);
}

morgan.token("thing", function(req, res, something) {
  //console.log("token: " + something + " => type: " + typeof something);
  return herp(req[something]);
});


