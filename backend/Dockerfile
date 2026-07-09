FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npx prisma generate && npm run build && npm prune --omit=dev

# prod
FROM node:22-alpine
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/schema.prisma ./

EXPOSE 3000

CMD ["node", "dist/index.js"]

