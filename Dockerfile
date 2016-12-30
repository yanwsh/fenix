FROM node:boron

#define argument
ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV:-production}

ARG PORT
ENV PORT ${PORT:-8000}

ARG LOG_LEVEL
ENV LOG_LEVEL ${LOG_LEVEL:-ERROR}

# Create app directory
ADD . /usr/src/fenix
WORKDIR /usr/src/fenix

# Install app dependencies
COPY package.json /usr/src/fenix/
RUN npm install

# Bundle app source
COPY . /usr/src/fenix

EXPOSE 8000
CMD [ "npm", "run", "prod:start" ]