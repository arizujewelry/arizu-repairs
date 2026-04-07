# ============================================
# Arizu Jewelry - Repair Management System
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Install client deps and build
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Copy server code
COPY server/ ./server/

# Create persistent directories
RUN mkdir -p server/data server/uploads

WORKDIR /app/server

EXPOSE 3001

CMD ["node", "index.js"]
