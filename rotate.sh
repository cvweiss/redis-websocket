#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

# Define the list of servers
servers=("server128gb" "zkbdbs1" "zkbdbs2")

# Loop through each server
for server in "${servers[@]}"; do
    nvm exec 8 node app.js $server
done
