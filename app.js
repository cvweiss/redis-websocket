#!/usr/bin/env node
"use strict";

const port = 15241;

const redis = require("redis").createClient();
const http = require("http").createServer((req, res) => { res.writeHead(404); res.end(); }).listen(port);
const ws = new (require("websocket").server)({ httpServer: http, autoAcceptConnections: true });

console.log(`${Date()} Server started and listening on port ${port}`);
redis.on("message", (channel, message) => {
        ws.connections.forEach(connection => connection.send(message));
        console.log(`${Date()} Broadcasted to ${ws.connections.length} clients: ${message}`);
        });
redis.subscribe("public");
