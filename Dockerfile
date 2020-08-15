FROM node:12-alpine

RUN apk --update add git
RUN apk add openssh python make gcc g++
RUN apk add openssl bash
RUN rm -rf /var/cache/apk/*

# required behind some ISP:
RUN git config --global url.https://github.com.insteadof git://github.com
WORKDIR /server
COPY package.json /server
COPY yarn.lock /server
RUN yarn
COPY . /server
RUN yarn test

