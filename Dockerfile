FROM node:20.9.0-alpine3.18

WORKDIR /home/node

# Set npm registry to a custom registry URL
RUN npm config set registry "https://nexusx.bcbsnc.com:8443/repository/npm-proxy/"

# Disable strict SSL verification
RUN npm config set strict-ssl false

# Verify npm and Node.js versions
RUN npm --version && \
    node --version

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm install

# Install serve globally
RUN npm install -g serve

# Copy the rest of the application code
COPY . .

# Build the Vite app
RUN npm run build

# Expose the port
EXPOSE 3000

# Serve the Vite app
CMD ["serve", "-s", "dist"]