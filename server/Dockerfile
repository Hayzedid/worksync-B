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

# Expose the port (Railway will set PORT environment variable)
EXPOSE ${PORT:-5000}

# Start the server
CMD ["npm", "start"] 