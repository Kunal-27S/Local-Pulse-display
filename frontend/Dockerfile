# Build stage
FROM node:18-slim as build

WORKDIR /app

# Clean install dependencies from scratch
COPY package*.json ./
RUN rm -rf node_modules package-lock.json && npm install

# Copy source code
COPY . .

# Optional: Clean and reinstall to ensure native modules match glibc system
RUN rm -rf node_modules package-lock.json && npm install

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
