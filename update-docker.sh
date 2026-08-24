#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
IMAGE_NAME="redis-websocket"
CONTAINER_NAME="redis-websocket"

if [[ ! -f "$ENV_FILE" ]]; then
	echo "Missing environment file: $ENV_FILE" >&2
	exit 1
fi

# Docker containers do not inherit host /etc/hosts or NSS hostname resolution.
# Resolve the configured Redis hosts here and provide the same mappings to Docker.
servers_value=""
while IFS= read -r line || [[ -n "$line" ]]; do
	if [[ "$line" == SERVERS=* ]]; then
		servers_value="${line#SERVERS=}"
		break
	fi
done < "$ENV_FILE"

declare -a extra_hosts=()
declare -a normalized_servers=()
IFS=',' read -r -a redis_servers <<< "$servers_value"
for server in "${redis_servers[@]}"; do
	server="${server#"${server%%[![:space:]]*}"}"
	server="${server%"${server##*[![:space:]]}"}"
	server="${server#\"}"
	server="${server%\"}"
	server="${server#\'}"
	server="${server%\'}"
	server="${server#"${server%%[![:space:]]*}"}"
	server="${server%"${server##*[![:space:]]}"}"

	if [[ -z "$server" ]]; then
		continue
	fi

	normalized_servers+=("$server")

	if [[ "$server" == "localhost" || "$server" =~ ^[0-9.]+$ || "$server" == *:* ]]; then
		continue
	fi

	if server_ip="$(getent ahostsv4 "$server" 2>/dev/null | awk 'NR == 1 { print $1 }')" && [[ -n "$server_ip" ]]; then
		extra_hosts+=(--add-host "$server:$server_ip")
	else
		echo "Warning: $server could not be resolved on the Docker host" >&2
	fi
done

if (( ${#normalized_servers[@]} == 0 )); then
	echo "SERVERS is missing or empty in $ENV_FILE" >&2
	exit 1
fi

normalized_servers_value="$(IFS=,; printf '%s' "${normalized_servers[*]}")"

docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"

if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
	docker rm --force "$CONTAINER_NAME"
fi

docker run -d \
	--restart unless-stopped \
	--name "$CONTAINER_NAME" \
	--env-file "$ENV_FILE" \
	--env "SERVERS=$normalized_servers_value" \
	--network host \
	--log-opt max-size=10m \
	--log-opt max-file=5 \
	"${extra_hosts[@]}" \
	"$IMAGE_NAME"
