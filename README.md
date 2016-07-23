# redis-websocket

Creates a websocket on port 15241 and broadcasts anything that is sent to Redis pubsub "public" to any clients connected to the websocket.

To install it:

    git clone https://github.com/cvweiss/redis-websocket.git
    cd redis-websocket
    npm install

To run it:

    nodejs app.js
