FROM node:20-alpine

WORKDIR /app

# Install dependencies needed for Prisma/Node on Alpine
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Generate the Prisma client
# (Ensure your DATABASE_URL is in your .env or passed during build/run)
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Set environment to production
ENV NODE_ENV=production

# Expose the port Next.js runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]