FROM node:20-bookworm-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY app.js ./

ENV PORT=15241

EXPOSE 15241

CMD ["npm", "start"]