# Video Streaming Integration Documentation

## Overview
Omi Live uses VDO.ninja for WebRTC-based video streaming. This provides:
- Zero infrastructure cost for up to ~120 concurrent viewers
- Low latency streaming (< 1 second)
- Built-in mesh networking for scalability
- No need for RTMP servers or transcoding

## Architecture

### Stream Flow
1. **Streamer** → VDO.ninja (WebRTC) → **Viewers**
2. Stream key creates unique VDO.ninja room: `omi-{streamKey}`
3. Mesh networking distributes load among viewers

### Backend Integration
- Stream key management via `/api/v1/users/stream-key`
- VDO.ninja URL generation for streamers and viewers
- Real-time stats tracking via Socket.IO
- Stream lifecycle management

## API Endpoints

### Stream Key Management

#### Get Stream Key
```
GET /api/v1/users/stream-key
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "message": "Stream key retrieved successfully",
  "data": {
    "streamKey": "abcde12345ABCDE12345fghij",
    "vdoRoomName": "omi-abcde12345ABCDE12345fghij"
  }
}
```

#### Regenerate Stream Key
```
POST /api/v1/users/stream-key/regenerate
Authorization: Bearer {token}
```

### Streaming Configuration

#### Get Streaming Config (Streamer)
```
GET /api/v1/streams/:id/streaming-config
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "message": "Streaming configuration retrieved successfully",
  "data": {
    "streamId": "123e4567-e89b-12d3-a456-426614174000",
    "streamKey": "abcde12345ABCDE12345fghij",
    "vdoNinja": {
      "streamerUrl": "https://vdo.ninja/?room=omi-abcde12345ABCDE12345fghij&push=abcde12345ABCDE12345fghij&...",
      "viewerUrl": "https://vdo.ninja/?room=omi-abcde12345ABCDE12345fghij&view=abcde12345ABCDE12345fghij&...",
      "roomName": "omi-abcde12345ABCDE12345fghij",
      "streamKey": "abcde12345ABCDE12345fghij",
      "obsConfig": {
        "browserSource": {
          "url": "...",
          "width": 1920,
          "height": 1080,
          "fps": 30,
          "customCss": "...",
          "hardwareAcceleration": true
        },
        "virtualCam": {
          "instructions": [...]
        },
        "directLink": "..."
      }
    },
    "instructions": [
      "Use the streamerUrl in OBS Browser Source or open in browser",
      "Share the viewerUrl with your viewers",
      "The stream will automatically connect when you go live"
    ]
  }
}
```

#### Get Viewer URL
```
GET /api/v1/streams/:id/viewer-url?audioOnly=false&lowLatency=true&maxQuality=720p
```

Response:
```json
{
  "success": true,
  "message": "Viewer URL generated successfully",
  "data": {
    "streamId": "123e4567-e89b-12d3-a456-426614174000",
    "streamTitle": "My Live Stream",
    "viewerUrl": "https://vdo.ninja/?room=omi-abcde12345ABCDE12345fghij&view=abcde12345ABCDE12345fghij&...",
    "isLive": true,
    "roomName": "omi-abcde12345ABCDE12345fghij"
  }
}
```

## OBS Studio Setup

### Method 1: Browser Source (Recommended)
1. Add a Browser Source in OBS
2. Get the streamer URL from `/api/v1/streams/:id/streaming-config`
3. Configure the browser source:
   - URL: Use the provided `streamerUrl`
   - Width: 1920
   - Height: 1080
   - FPS: 30
   - Custom CSS: Use the provided CSS
   - Check "Shutdown source when not visible"
   - Check "Refresh browser when scene becomes active"

### Method 2: Direct Browser
1. Open the `streamerUrl` in Chrome/Edge
2. Allow camera and microphone permissions
3. Use OBS Virtual Camera or Window Capture

## Frontend Integration

### Streamer Component
```tsx
// Use the VDO.ninja iframe for streaming
<iframe
  src={streamConfig.vdoNinja.streamerUrl}
  className="w-full h-full"
  allow="camera; microphone; autoplay"
/>
```

### Viewer Component
```tsx
// Use the viewer URL for watching
<iframe
  src={viewerUrl}
  className="w-full h-full"
  allow="autoplay"
/>
```

## Quality Settings

### Streamer Quality Presets
- **Low**: 640x360 @ 15fps, 1000 kbps
- **Medium**: 1280x720 @ 30fps, 2500 kbps
- **High**: 1920x1080 @ 30fps, 4000 kbps
- **Ultra**: 1920x1080 @ 60fps, 6000 kbps

### Viewer Options
- `audioOnly`: Audio-only mode for low bandwidth
- `lowLatency`: Minimize buffering for interactive streams
- `maxQuality`: Limit quality (360p, 720p, 1080p)

## Security
- Stream keys are unique per user (25 character alphanumeric)
- Only streamers and admins can access stream keys
- Room names are prefixed with "omi-" to avoid conflicts
- Optional password protection for rooms

## Monitoring & Analytics
- Real-time viewer count via Socket.IO
- Stream quality metrics from VDO.ninja iframe events
- Connection state tracking
- Bandwidth usage monitoring

## Troubleshooting

### Common Issues
1. **Black screen**: Check camera permissions
2. **No audio**: Check microphone permissions
3. **High latency**: Enable low latency mode
4. **Poor quality**: Check internet upload speed

### Browser Requirements
- Chrome 80+ or Edge 80+ (recommended)
- Firefox 75+ (limited features)
- Safari 14+ (iOS/macOS only)

## Future Enhancements
- [ ] Multi-host streaming support
- [ ] Stream recording to cloud storage
- [ ] Custom TURN server for better connectivity
- [ ] Advanced analytics dashboard