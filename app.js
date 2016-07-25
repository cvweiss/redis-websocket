	
	"use strict";

	const server 	= require("websocket").server;
	const http 		= require("http");
	const redis 	= require("redis");

	const port 		= 15241;

	const web 		= http.createServer((req, res) => { res.writeHead(404); res.end(); });
		web.listen(port, () => console.log(`${Date()} Server is listening on port ${port}`));

	const ws 		= new server({ httpServer: web });
		ws.on("request", request => request.accept());

	const client 	= redis.createClient();
		client.on("message", (channel, message) => {
			ws.connections.forEach(connection => connection.send(message));
			console.log(`${Date()} Broadcasted to ${ws.connections.length} clients: ${message}`);
		});
		client.subscribe("public");