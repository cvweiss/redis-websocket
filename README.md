# redis-websocket

Creates a websocket on port 15241 and broadcasts anything that is sent to Redis pubsub "public" to any clients connected to the websocket.

To install it:

    git clone https://github.com/cvweiss/redis-websocket.git
    cd redis-websocket
    npm install

To run it:

    nodejs app.js

Example:

    > nodejs app.js
    Sat Jul 23 2016 20:54:15 GMT+0000 (UTC) Server is listening on port 15241
    Sat Jul 23 2016 20:54:20 GMT+0000 (UTC) Broadcasted to 72 clients: ping
    Sat Jul 23 2016 20:54:40 GMT+0000 (UTC) Broadcasted to 122 clients: pong
    Sat Jul 23 2016 20:55:02 GMT+0000 (UTC) Broadcasted to 239 clients: {"action": "test"}
    
