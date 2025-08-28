#!/usr/bin/env node

const io = require('socket.io-client');

// Connect to your Socket.IO server
const socket = io('http://localhost:9000', {
  auth: {
    token: 'your-auth-token-here' // Get from browser cookies
  }
});

// Log all events
socket.onAny((event, ...args) => {
  console.log(`📥 Received: ${event}`, args);
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  
  // Test stream join
  console.log('🧪 Testing stream join...');
  socket.emit('stream:join', { 
    streamId: '92a0c870-8bc6-4f3f-b834-bf634333146a' 
  });
  
  // Test chat message
  setTimeout(() => {
    console.log('🧪 Testing chat message...');
    socket.emit('chat:send-message', {
      streamId: '92a0c870-8bc6-4f3f-b834-bf634333146a',
      content: 'Hello from test script!'
    });
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
});

socket.on('error', (error) => {
  console.log('🚨 Error:', error);
});

// Keep script running
process.on('SIGINT', () => {
  console.log('\n👋 Disconnecting...');
  socket.disconnect();
  process.exit();
});
