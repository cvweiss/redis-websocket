#!/bin/bash

docker build -t redis-websocket .
docker stop redis-websocket
docker rm redis-websocket
docker run -d --restart unless-stopped --name redis-websocket --env-file .env --network host --log-opt max-size=10m --log-opt max-file=5 redis-websocket

