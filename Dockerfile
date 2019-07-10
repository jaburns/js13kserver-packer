FROM node:12-slim

RUN apt-get update
RUN apt-get install -y mono-runtime

COPY tools /root/tools

CMD ["/root/tools/advzip.linux"]
