# Use Node.js 20 LTS as the base image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your backend code
COPY . .

# Expose the port your app runs on (default 5000)
EXPOSE 5000

# Add a Dockerfile step to debug
RUN cat .env || echo "No .env file found"

# Start the server
CMD ["npm", "start"] 