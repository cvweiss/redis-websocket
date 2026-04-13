#!/usr/bin/env node
"use strict";

require("dotenv").config(); // Load .env
const os = require("os");
const http = require("http");
const { createClient } = require("redis");
const { server: WebSocketServer } = require("websocket");

const servers = (process.env.SERVERS || "")
	.split(",")
	.map(s => s.trim())
	.filter(Boolean);

const port = parseInt(process.env.PORT, 10) || 15241;

if (servers.length === 0) {
	console.error("No SERVERS defined in .env");
	process.exit(1);
}

(async () => {
	let started = false;

	for (const server of servers) {
		console.log(`\n=== Starting for server: ${server} ===`);

		const hostname = os.hostname();
		const healthcheckKey = `redis-websocket:healthcheck:${hostname}:${process.pid}:${server}`;

		const redis = createClient({ url: `redis://${server}:6379` });
		redis.on("error", (err) => console.error(`Redis Client Error [${server}]:`, err));

		let redis2;

		try {
			await redis.connect();

			// Test write access to confirm we are talking to a writable primary.
			await redis.set(healthcheckKey, `${Date.now()}`, { EX: 5 });
			console.log(`Connected successfully to ${server}`);

			// Duplicate client for housekeeping
			redis2 = redis.duplicate();
			await redis2.connect();
		} catch (err) {
			console.error(`❌ Failed to connect or write to ${server}: ${err.message}`);
			try {
				if (redis2) {
					await redis2.quit();
				}
			} catch (_) { }
			try {
				await redis.quit();
			} catch (_) { }
			continue; // Skip to next server
		}

		// HTTP + WebSocket server
		const httpServer = http.createServer((req, res) => {
			res.writeHead(404);
			res.end();
		});

		try {
			await new Promise((resolve, reject) => {
				const onListening = () => {
					httpServer.off("error", onError);
					resolve();
				};
				const onError = (err) => {
					httpServer.off("listening", onListening);
					reject(err);
				};

				httpServer.once("listening", onListening);
				httpServer.once("error", onError);
				httpServer.listen(port);
			});
		} catch (err) {
			console.error(`❌ Failed to listen on port ${port} for ${server}: ${err.message}`);
			try {
				await redis2.quit();
			} catch (_) { }
			try {
				await redis.quit();
			} catch (_) { }
			continue;
		}

		const ws = new WebSocketServer({
			httpServer: httpServer,
			autoAcceptConnections: true,
		});

		// PubSub using pSubscribe
		try {
			await redis.pSubscribe("*", (message, channel) => {
				let count = 0;
				let error = 0;
				ws.connections.forEach((connection) => {
					let broadcasted = false;
					if (connection.subscriptions instanceof Array) {
						if (!broadcasted && connection.subscriptions.includes(channel)) {
							try {
								connection.send(message);
								count++;
								broadcasted = true;
							} catch (e) {
								error++;
							}
						}
					}
				});
				if (count > 0) console.log(`${Date()} Broadcasted ${channel} to ${count} clients`);
				if (error > 0) console.log(`${Date()} Broadcasted ${channel} with ${error} errors`);
			});
		} catch (err) {
			console.error(`❌ Failed to subscribe on ${server}: ${err.message}`);
			ws.shutDown();
			await new Promise((resolve) => httpServer.close(resolve));
			try {
				await redis2.quit();
			} catch (_) { }
			try {
				await redis.quit();
			} catch (_) { }
			continue;
		}

		console.log(`${Date()} Server started for ${server} on port ${port}`);

		// Handle WebSocket subscriptions
		ws.on("connect", (connection) => {
			connection.on("message", (message) => {
				if (message.type === "utf8") {
					try {
						const data = JSON.parse(message.utf8Data);
						if (connection.subscriptions === undefined) connection.subscriptions = [];
						if (data.action === "sub") {
							if (!connection.subscriptions.includes(data.channel)) {
								connection.subscriptions.push(data.channel);
							}
						} else if (data.action === "unsub") {
							const index = connection.subscriptions.indexOf(data.channel);
							if (index > -1) {
								connection.subscriptions.splice(index, 1);
							}
						}
					} catch (e) {
						// ignore malformed JSON
					}
				}
			});
		});

		// Update WebSocket count in Redis
		async function updateWsCount() {
			try {
				await redis2.hSet("zkb:websockets", `${hostname}:${server}`, ws.connections.length);
			} catch (e) {
				console.error("updateWsCount failed:", e);
				process.exit(1);
			}
		}
		setInterval(updateWsCount, 1000);
			started = true;
			break;
	}

	if (!started) {
		console.error("❌ Failed to start with any configured Redis server");
		process.exit(1);
	}
})();
