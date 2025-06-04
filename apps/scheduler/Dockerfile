# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR app

COPY tsconfig.json package.json yarn.lock ./
COPY packages ./packages
COPY apps/scheduler ./apps/scheduler

RUN yarn install --frozen-lockfile && \
    yarn workspace @monorepo/shared-utils build && \
    yarn workspace @monorepo/scheduler build

# (End of Stage 1: Builder)

CMD ["yarn", "workspace", "@monorepo/scheduler", "start"]
