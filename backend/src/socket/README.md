# Socket.IO Real-time Chat System

This directory contains the Socket.IO implementation for real-time chat and streaming features.

## Architecture

### Core Components

1. **Socket Server** (`/config/socket/socket.config.ts`)
   - Singleton Socket.IO server configuration
   - CORS setup and connection management
   - Namespace management

2. **Handlers**
   - `chat.handler.ts`: Chat message handling with rate limiting, moderation, reactions
   - `stream.handler.ts`: Stream room management and analytics
   - `chat-commands.ts`: Slash command processing for moderator actions

3. **Managers**
   - `room.manager.ts`: Stream room state management
   - `rate-limiter.ts`: Role-based rate limiting and slow mode

4. **Middleware**
   - `auth.middleware.ts`: JWT-based socket authentication

## Features

### Chat System
- Real-time message delivery
- Message replies and threading
- Emoji reactions with live updates
- Message pinning by moderators
- Soft delete with moderation history

### Rate Limiting
- Role-based message limits:
  - Anonymous: 5 messages/minute
  - Viewer: 10 messages/minute
  - Subscriber: 20 messages/minute
  - Moderator: 100 messages/minute
  - Streamer/Admin: Unlimited
- Cooldown system for spam prevention
- Configurable slow mode per stream

### Moderation
- Timeout users with duration
- Ban/unban functionality
- Message deletion
- Chat clearing
- Moderator management (add/remove)
- Moderation history tracking

### Chat Commands
All commands start with `/`:
- `/help` - Show available commands
- `/timeout <user> <seconds> [reason]` - Temporarily mute user
- `/ban <user> [reason]` - Permanently ban user
- `/unban <user>` - Remove ban
- `/slowmode [seconds]` - Enable slow mode (0 to disable)
- `/clear` - Clear all chat messages
- `/pin <messageId>` - Pin a message
- `/unpin` - Unpin current message
- `/mod <user>` - Add moderator
- `/unmod <user>` - Remove moderator
- `/uptime` - Show stream uptime
- `/viewers` - Show viewer count

### Socket Events

#### Client -> Server
- `stream:join` - Join a stream room
- `stream:leave` - Leave a stream room
- `chat:send-message` - Send a chat message
- `chat:delete-message` - Delete a message
- `chat:moderate-user` - Moderate a user
- `chat:react` - React to a message
- `chat:pin-message` - Pin/unpin a message
- `chat:slowmode` - Toggle slow mode

#### Server -> Client
- `chat:message` - New message broadcast
- `chat:message:deleted` - Message deleted
- `chat:user:moderated` - User moderated
- `chat:reaction:added` - Reaction added
- `chat:reaction:removed` - Reaction removed
- `chat:message:pinned` - Message pinned
- `chat:slowmode:enabled` - Slow mode enabled
- `chat:command:error` - Command error
- `chat:system:message` - System message

## Database Schema

### New Tables
- `MessageReaction` - Stores emoji reactions
- `ChatModeration` - Moderation history
- `StreamModerator` - Stream-specific moderators

### Enhanced Tables
- `Comment` - Added isPinned, isDeleted, reactions
- `Stream` - Added slowModeDelay

## Usage Example

```typescript
// Client connection
const socket = io('http://localhost:3000', {
  auth: {
    token: 'jwt-token-here'
  }
});

// Join stream
socket.emit('stream:join', { streamId: 'stream-uuid' });

// Send message
socket.emit('chat:send-message', {
  streamId: 'stream-uuid',
  content: 'Hello world!'
});

// React to message
socket.emit('chat:react', {
  messageId: 'message-uuid',
  emoji: '👍'
});

// Listen for messages
socket.on('chat:message', (message) => {
  console.log('New message:', message);
});
```

## Testing

Tests are located in `__tests__/` directories:
- `chat.handler.spec.ts` - Chat handler tests
- `chat-commands.spec.ts` - Command handler tests
- `rate-limiter.spec.ts` - Rate limiting tests

Run tests with: `npm run test`