var WebSocketServer = require('websocket').server;
var http = require('http');
var redis = require("redis");
var client = redis.createClient();
var conns = [];

var port = 15241;

var server = http.createServer(function(request, response) {
        response.writeHead(404);
        response.end();
        });

server.listen(port, function() {
        console.log((new Date()) + ' Server is listening on port ' + port);
        });

wsServer = new WebSocketServer({ httpServer: server});
wsServer.on('request', function(request) {
        var connection = request.accept();
        conns.push(connection);
        connection.on('close', function(reasonCode, description) {
                index = conns.indexOf(connection);
                if (index > -1) {
                conns.splice(index, 1);
                }
                });
});

client.on("message", function(channel, message) {
        conns.forEach(function (each) {
            each.send(message);
            });
        console.log((new Date()) + " Broadcasted to " + conns.length + " clients: " + message);
        });
client.subscribe('public');
