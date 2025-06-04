# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR app

COPY tsconfig.json package.json yarn.lock ./
COPY packages ./packages
COPY apps/result-handler ./apps/result-handler

RUN yarn install --frozen-lockfile && \
    yarn workspace @monorepo/shared-utils build && \
    yarn workspace @monorepo/result-handler build

# (End of Stage 1: Builder)

CMD ["yarn", "workspace", "@monorepo/result-handler", "start"]
