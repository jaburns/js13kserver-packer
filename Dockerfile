FROM node:12

RUN apt-get update
RUN apt-get install -y mono-runtime

RUN mkdir -p /var/app/js13kserver

COPY package*.json /var/app/
COPY js13kserver/package*.json /var/app/js13kserver/

WORKDIR /var/app/js13kserver
RUN npm install

WORKDIR /var/app
RUN npm install

COPY . /var/app

ENV PORT 3000
EXPOSE 3000

RUN npm run pack

CMD ["npm", "start"]
