FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Install client dependencies and build
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Copy server source
COPY server/ ./server/

# Create persistent directories
RUN mkdir -p server/data server/uploads

EXPOSE 3001

CMD ["node", "server/index.js"]
