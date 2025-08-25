const io = require('socket.io-client');

console.log('Connecting to WebSocket server...');
const socket = io('http://localhost:9000', {
  transports: ['websocket'],
  reconnection: false
});

socket.on('connect', () => {
  console.log('✅ Connected! Socket ID:', socket.id);
  
  // Join a test stream
  console.log('Joining stream room...');
  socket.emit('stream:join', { streamId: 'test-stream-123' });
  
  setTimeout(() => {
    // Send a test message
    console.log('Sending chat message...');
    socket.emit('chat:send-message', {
      streamId: 'test-stream-123',
      content: 'Test message from script'
    });
  }, 1000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

socket.on('chat:message', (msg) => {
  console.log('📨 Received chat message:', msg);
});

socket.on('chat:message:sent', (msg) => {
  console.log('✉️ Message sent confirmation:', msg);
});

socket.on('stream:joined', (data) => {
  console.log('🎥 Joined stream:', data);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Close after 5 seconds
setTimeout(() => {
  console.log('Closing connection...');
  socket.close();
  process.exit(0);
}, 5000);