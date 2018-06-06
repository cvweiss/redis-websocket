# redis-websocket

Creates a websocket on port 15241, listens to all channels on redis, and will publish to each connection the messages from each channel they have subscribed.

To install it:

    git clone https://github.com/cvweiss/redis-websocket.git
    cd redis-websocket
    npm install

To run it:

    nodejs app.js
    
To listen to the public channel, from the browser client connecting to the websocket:

    ws.send(JSON.stringify({'action':'sub','channel':'public'}));
    
Additional channels can be specified one at a time:

    ws.send(JSON.stringify({'action':'sub','channel':'datastream'}));

Example:

    > nodejs app.js
    Sat Jul 23 2016 20:54:15 GMT+0000 (UTC) Server is listening on port 15241
    Sat Jul 23 2016 20:54:20 GMT+0000 (UTC) Broadcasted to 72 clients: ping
    Sat Jul 23 2016 20:54:40 GMT+0000 (UTC) Broadcasted to 122 clients: pong
    Sat Jul 23 2016 20:55:02 GMT+0000 (UTC) Broadcasted to 239 clients: {"action": "test"}
    
An example of an nginx configuration that listens to port 2096 and passes this to the node app

    server {
        listen 2096 ssl;
        listen [::]:2096 ssl;
        server_name wss.example.com;

        include snippets/self-signed.conf;
        include snippets/ssl-params.conf;

        location / {
                proxy_pass http://127.0.0.1:15241;
                proxy_http_version 1.1;
                proxy_set_header   Upgrade $http_upgrade;
                proxy_set_header   Connection "upgrade";
                proxy_set_header Host $host;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        access_log off;
    }
