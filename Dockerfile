FROM node:20-alpine3.18 AS base

# Add network timeout and retry logic
RUN apk add --no-cache wget

# Increase npm registry timeout and set max retries
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-timeout 600000

# Rest of the Dockerfile remains the same as previous version
