FROM node:20-slim

WORKDIR /app

# Copy dependency + config files
COPY package*.json ./
COPY tsconfig*.json ./
COPY src ./src

# Install deps (this will run "prepare", but now TS files exist)
RUN npm install

# (Optional) explicit build; if "prepare" already builds, you can skip this
# RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]