# Chat History API Documentation

## Get Stream Chat History

Retrieve chat messages for a stream with advanced filtering and pagination options.

### Endpoint
```
GET /api/v1/streams/:id/comments
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `before` | ISO 8601 datetime | - | Get messages before this timestamp |
| `after` | ISO 8601 datetime | - | Get messages after this timestamp |
| `limit` | number (1-100) | 50 | Number of messages to return |
| `cursor` | UUID | - | Cursor for pagination (message ID) |
| `includeDeleted` | boolean | false | Include deleted messages |
| `orderBy` | 'asc' \| 'desc' | 'asc' | Sort order (asc for chat history) |

### Example Requests

#### Basic Chat History
```bash
GET /api/v1/streams/123e4567-e89b-12d3-a456-426614174000/comments
```

#### With Pagination
```bash
GET /api/v1/streams/123e4567-e89b-12d3-a456-426614174000/comments?limit=20&cursor=223e4567-e89b-12d3-a456-426614174000
```

#### Date Range Filtering
```bash
GET /api/v1/streams/123e4567-e89b-12d3-a456-426614174000/comments?after=2025-01-20T10:00:00Z&before=2025-01-20T11:00:00Z
```

#### Include Deleted Messages
```bash
GET /api/v1/streams/123e4567-e89b-12d3-a456-426614174000/comments?includeDeleted=true
```

### Response Format

```json
{
  "success": true,
  "message": "Chat history retrieved successfully",
  "data": {
    "messages": [
      {
        "id": "223e4567-e89b-12d3-a456-426614174000",
        "content": "Hello chat!",
        "userId": "user-123",
        "username": "testuser",
        "avatarUrl": "https://example.com/avatar.jpg",
        "role": "streamer",
        "timestamp": "2025-01-20T10:00:00.000Z",
        "type": "message",
        "isPinned": false,
        "isDeleted": false,
        "replyTo": null,
        "reactions": [
          {
            "emoji": "👍",
            "userId": "user-789"
          }
        ],
        "reactionCount": 1
      }
    ],
    "hasMore": true,
    "nextCursor": "323e4567-e89b-12d3-a456-426614174000"
  }
}
```

### Error Responses

#### Stream Not Found
```json
{
  "success": false,
  "message": "Stream not found",
  "data": null,
  "errors": null
}
```

### Notes

1. **Cursor-based Pagination**: Use the `nextCursor` from the response as the `cursor` parameter for the next request.
2. **Order**: Default order is ascending (oldest first) for chat history. Use `desc` for newest first.
3. **Deleted Messages**: When `includeDeleted` is true, deleted messages will have `isDeleted: true` and content may be sanitized.
4. **Performance**: Limit is capped at 100 messages per request for performance reasons.

### WebSocket Alternative

For real-time chat history, you can also use the WebSocket endpoint:

```javascript
socket.emit('chat:get:history', {
  streamId: '123e4567-e89b-12d3-a456-426614174000',
  before: '2025-01-20T11:00:00Z',
  limit: 50
});

socket.on('chat:history', (data) => {
  console.log('Chat history:', data.messages);
});
```