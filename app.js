#!/usr/bin/env node
"use strict";

const port = 15241;

const redis = require("redis").createClient();
const redis2 = require("redis").createClient();
const http = require("http").createServer((req, res) => { res.writeHead(404); res.end(); }).listen(port);
const ws = new (require("websocket").server)({ httpServer: http, autoAcceptConnections: true });

console.log(`${Date()} Server started and listening on port ${port}`);
redis.on("pmessage", (pattern, channel, message) => {
        var count = 0;
        var error = 0;
        ws.connections.forEach( (connection) => {
            var broadcasted = false;
            if (connection.subscriptions instanceof Array) {
                if (broadcasted === false && connection.subscriptions.indexOf(channel) !== -1) {
                    try {
                        connection.send(message);
                        count++;
                        broadcasted = true;
                        redis2.setex(`r2w:broadcasted:${channel}`, 9600, true, redis.print);
                    } catch (e) {
                        error++;
                    }
                }
            }
        });
        if (count > 0) console.log(`${Date()} Broadcasted ${channel} to ${count} clients`);
        if (error > 0) console.log(`${Date()} Broadcasted ${channel} with ${count} errors`);
        updateWsCount(redis2, ws.connections.length);
        });
redis.psubscribe("*");

ws.on('connect', (connection) => {
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            try {
                var data = JSON.parse(message.utf8Data);
                if (connection.subscriptions === undefined) connection.subscriptions = new Array();
                if (data.action === 'sub') {
                    redis2.setex(`r2w:broadcasted:${data.channel}`, 9600, true, redis.print);
                    var index = connection.subscriptions.indexOf(data.channel);
                    if (index == -1) {
                        connection.subscriptions.push(data.channel);
                    }
                }
                else if (data.action === 'unsub') {
                    var index = connection.subscriptions.indexOf(data.channel);
                    if (index > -1) {
                        connection.subscriptions.splice(index, 1);
                    }
                }
            } catch (e) {
            };
        }
    });    
});

function updateWsCount(redis, count) {
    redis.setex("zkb:websocketCount", 30, count, redis.print);
}
