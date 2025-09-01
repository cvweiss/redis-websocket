#!/usr/bin/env node
"use strict";

const os = require('os');
const hostname = os.hostname();

console.log('Hostname:', os.hostname());

const port = 15241;

const host = process.argv[2] ?? 'localhost';

console.log('Trying', host);
const redis = require("redis").createClient(6379, host);
redis.setex('foo', 5, 'bar'); // test that we can write
const redis2 = redis.duplicate();
const http = require("http").createServer((req, res) => { res.writeHead(404); res.end(); }).listen(port);
const ws = new (require("websocket").server)({ httpServer: http, autoAcceptConnections: true });

console.log(`${Date()} Server started and listening on port ${port}`);
redis.on("pmessage", (pattern, channel, message) => {
	var count = 0;
	var error = 0;
	ws.connections.forEach((connection) => {
		var broadcasted = false;
		if (connection.subscriptions instanceof Array) {
			if (broadcasted === false && connection.subscriptions.indexOf(channel) !== -1) {
				try {
					connection.send(message);
					count++;
					broadcasted = true; // prevents broadcasting the same message across multiple channels
				} catch (e) {
					error++;
				}
			}
		}
	});
	if (count > 0) console.log(`${Date()} Broadcasted ${channel} to ${count} clients`);
	if (error > 0) console.log(`${Date()} Broadcasted ${channel} with ${count} errors`);
});
redis.psubscribe("*");

ws.on('connect', (connection) => {
	connection.on('message', function (message) {
		if (message.type === 'utf8') {
			try {
				var data = JSON.parse(message.utf8Data);
				if (connection.subscriptions === undefined) connection.subscriptions = new Array();
				if (data.action === 'sub') {
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

function updateWsCount() {
	try {
		redis2.hset('zkb:websockets', hostname, ws.connections.length);
	} catch (e) {
		process.exit(1);
	}
}
setInterval(updateWsCount, 1000);
