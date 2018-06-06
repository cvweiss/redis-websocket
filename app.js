#!/usr/bin/env node
"use strict";

const port = 15241;

const redis = require("redis").createClient();
const http = require("http").createServer((req, res) => { res.writeHead(404); res.end(); }).listen(port);
const ws = new (require("websocket").server)({ httpServer: http, autoAcceptConnections: true });

console.log(`${Date()} Server started and listening on port ${port}`);
redis.on("pmessage", (pattern, channel, message) => {
        var count = 0;
        ws.connections.forEach( (connection) => {
            if (connection.subscriptions instanceof Array) {
                if (connection.subscriptions.indexOf(channel) != -1) {
                    connection.send(message);
                    count++;
                }
            }
        });
        console.log(`${Date()} Broadcasted to ${count} clients: ${message}`);
        });
redis.psubscribe("*");

ws.on('connect', (connection) => {
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            try {
                var data = JSON.parse(message.utf8Data);
                if (connection.subscriptions === undefined) connection.subscriptions = new Array();
                if (data.action == 'sub') connection.subscriptions.push(data.channel);
            } catch (e) {
            };
        }
    });    
});
