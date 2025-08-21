# Stage 1: Build the React application
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the production build with a lightweight server
FROM nginx:alpine
# Copy the built files from the 'builder' stage
COPY --from=builder /app/dist /usr/share/nginx/html
# Expose port 80 for web traffic
EXPOSE 80
# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]
