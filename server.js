var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

/***********************************
 * Boot routes and message handlers
 **********************************/
require('./src/http-routes')(app, io);
require('./src/message-handlers')(io);

/*******************************
 * Launch the Webserver
 *******************************/
var port = 3000;
http.listen(port, () => console.log("Texas holdem server running at http://localhost:" + port));