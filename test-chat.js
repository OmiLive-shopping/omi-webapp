const io = require('socket.io-client');

const socket = io('http://localhost:9000', {
  transports: ['websocket'],
  reconnection: true,
});

socket.on('connect', () => {
  console.log('Connected! Socket ID:', socket.id);
  
  // Join a test stream
  const streamId = 'test-stream-123';
  socket.emit('stream:join', { streamId });
  
  // Send a test message after joining
  setTimeout(() => {
    console.log('Sending test message...');
    socket.emit('chat:send-message', {
      streamId: streamId,
      content: 'Test message from script'
    });
  }, 1000);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('chat:message', (message) => {
  console.log('Received chat message:', message);
});

socket.on('chat:message:sent', (message) => {
  console.log('Message sent confirmation:', message);
});

socket.on('stream:joined', (data) => {
  console.log('Joined stream:', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Keep the script running
setTimeout(() => {
  console.log('Test complete');
  process.exit(0);
}, 10000);