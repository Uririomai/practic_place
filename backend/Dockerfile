FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# dev
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "npx prisma generate && npm run dev"]

# prod
FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/schema.prisma ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
