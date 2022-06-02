##############################################

# THIS DOCKERFILE FOR PRODUCTION ENVIRONMENT #

##############################################

################################
## Install production modules ##
################################
FROM node:16-slim AS modules

WORKDIR /app

COPY ./* ./

RUN yarn install --frozen-lockfile  --production=true

################################
## Build TypeScript Resources ##
################################
FROM node:16-slim AS builder

WORKDIR /app

COPY ./* ./
COPY ./src ./src

RUN yarn install --frozen-lockfile && yarn build

################################
##   Running production apps  ##
################################
FROM node:16-slim

ENV NODE_ENV=production

WORKDIR /app

COPY ./package.json .
COPY --from=builder /app/dist ./dist
COPY --from=modules /app/node_modules ./node_modules

# Remove comment out if the application is server
# EXPOSE 3000

CMD [ "yarn", "start"]
