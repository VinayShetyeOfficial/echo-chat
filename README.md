# Echo Chat - Setup and Run Guide

## Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** - You can use:
  - Local MongoDB installation, or
  - MongoDB Atlas (cloud database) - [Sign up here](https://www.mongodb.com/atlas)
- **Git** (optional, for cloning)

## Quick Start

### 1. Install Dependencies

First, install dependencies for both client and server:

```bash
# Install client dependencies
cd CLIENT
npm install

# Install server dependencies
cd ../SERVER
npm install
```

### 2. Environment Setup

Create environment files for both client and server:

**SERVER/.env**
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/echo-chat
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/echo-chat

# JWT Secret (change this to a secure random string)
JWT_SECRET=your-super-secret-jwt-key-here-change-this

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**CLIENT/.env** (optional)
```env
# API URL (points to your backend server)
VITE_API_URL=http://localhost:3001/api
```

### 3. Start the Application

You need to run both the server and client simultaneously:

**Terminal 1 - Start the Backend Server:**
```bash
cd SERVER
npm run dev
```

**Terminal 2 - Start the Frontend Client:**
```bash
cd CLIENT
npm run dev
```

### 4. Access the Application

Once both are running:

- **Frontend**: Open [http://localhost:5173](http://localhost:5173) in your browser
- **Backend API**: Available at [http://localhost:3001](http://localhost:3001)

## First Time Setup

### Create Your First Account

1. Go to [http://localhost:5173](http://localhost:5173)
2. Click "Sign Up" tab
3. Create an account with:
   - Username (3-30 characters, letters/numbers/underscores only)
   - Valid email address
   - Strong password (8+ chars, uppercase, lowercase, number/special char)

### Start Chatting

1. After logging in, you'll see the main chat interface
2. Click "Create New Channel" to start a group chat
3. Or click "Start Direct Message" for one-on-one chat
4. Invite others using the "Invite People" button

## Development Scripts

### Server Scripts
```bash
cd SERVER

# Development with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Client Scripts
```bash
cd CLIENT

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
- Make sure MongoDB is running locally, or
- Check your MongoDB Atlas connection string
- Verify the MONGODB_URI in SERVER/.env

**2. Port Already in Use**
- Server (3001): Kill any process using port 3001
- Client (5173): Kill any process using port 5173
- Or change ports in the respective config files

**3. CORS Errors**
- Ensure CORS_ORIGIN in SERVER/.env matches your client URL
- Default should be `http://localhost:5173`

**4. Authentication Issues**
- Clear browser localStorage and cookies
- Check JWT_SECRET is set in SERVER/.env
- Restart the server after changing environment variables

### Database Setup

**Using Local MongoDB:**
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/echo-chat`

**Using MongoDB Atlas:**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string from "Connect" button
4. Replace `<username>`, `<password>`, and `<cluster-url>` in the connection string

## Features to Test

Once running, try these features:

✅ **Authentication**
- Sign up with a new account
- Log in and out
- Password validation

✅ **Messaging**
- Send text messages
- Edit and delete your messages
- Reply to messages
- Add emoji reactions

✅ **File Sharing**
- Upload images, audio files, documents
- View images in gallery mode
- Play audio messages

✅ **Channels**
- Create group channels
- Start direct messages
- Invite users to channels

✅ **Real-time Features**
- Messages appear instantly
- See when others are typing
- Live reactions and updates

## Production Deployment

For production deployment:

1. Set NODE_ENV=production in server environment
2. Use a production MongoDB instance
3. Configure proper CORS origins
4. Use HTTPS for secure connections
5. Set strong JWT secrets
6. Configure file upload limits and storage

## Need Help?

If you encounter issues:

1. Check the browser console for client-side errors
2. Check server terminal for backend errors
3. Verify all environment variables are set correctly
4. Ensure both client and server are running
5. Try clearing browser cache and localStorage

The application should now be running and ready for testing! 🚀