FROM node:8.11.1-alpine

RUN apk --update add git && rm -rf /var/cache/apk/*
# required behind some ISP:
RUN git config --global url.https://github.com.insteadof git://github.com

RUN apk --no-cache add git openssh python make gcc g++ && rm -rf /var/cache/apk/*

WORKDIR /contracts
COPY . /contracts
RUN yarn

CMD ["yarn", "rocketh", "launch", "-n", "http://ethereum:8545", "node", "deploy.js", "http://server:8081"]
