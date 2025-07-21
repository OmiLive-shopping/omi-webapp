# Real-Time Stream Stats Documentation

## Overview
Real-time stream statistics are collected from VDO.ninja and transmitted to the backend via Socket.IO. This allows monitoring stream health, quality, and performance metrics.

## Socket Events

### Sending Stream Stats (Frontend → Backend)

#### Event: `stream:stats:update`
Sent by the streamer's client to update stream statistics.

```javascript
socket.emit('stream:stats:update', {
  streamId: '123e4567-e89b-12d3-a456-426614174000',
  stats: {
    bitrate: 2500,        // Current bitrate in kbps
    fps: 30,              // Frames per second
    resolution: {
      width: 1920,
      height: 1080
    },
    audioLevel: -20,      // Audio level in dB
    packetLoss: 0.5,      // Packet loss percentage
    latency: 45,          // Latency in milliseconds
    bandwidth: {
      upload: 5000,       // Upload bandwidth in kbps
      download: 10000     // Download bandwidth in kbps
    }
  },
  timestamp: '2025-01-21T10:30:00.000Z'
});
```

Response Events:
- `stream:stats:received` - Acknowledgment of stats receipt
- `error` - If unauthorized or invalid data

### Getting Current Stats (Frontend → Backend)

#### Event: `stream:stats:get`
Request current stream statistics.

```javascript
socket.emit('stream:stats:get', {
  streamId: '123e4567-e89b-12d3-a456-426614174000'
});
```

Response Event: `stream:stats:current`
```javascript
{
  streamId: '123e4567-e89b-12d3-a456-426614174000',
  stats: {
    bitrate: 2500,
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    audioLevel: -20,
    packetLoss: 0.5,
    latency: 45,
    bandwidth: { upload: 5000, download: 10000 },
    lastUpdated: '2025-01-21T10:30:00.000Z'
  },
  viewerCount: 45
}
```

### Receiving Stats Updates (Backend → Frontend)

#### Event: `stream:stats:update`
Broadcast to moderators and analytics viewers when stats are updated.

```javascript
socket.on('stream:stats:update', (data) => {
  console.log('Stream stats updated:', data);
  // data contains: { streamId, stats, timestamp }
});
```

## Frontend Integration Example

```typescript
// In the streaming component
import { useVdoNinja } from '@/hooks/useVdoNinja';
import { useSocket } from '@/hooks/useSocket';

function StreamerStudio({ streamId }: { streamId: string }) {
  const socket = useSocket();
  const { stats } = useVdoNinja({
    mode: 'streamer',
    params: { streamKey },
    onStats: (vdoStats) => {
      // Send stats to backend every 5 seconds
      socket.emit('stream:stats:update', {
        streamId,
        stats: {
          bitrate: vdoStats.bitrate,
          fps: vdoStats.fps,
          resolution: vdoStats.resolution,
          audioLevel: vdoStats.audioLevel,
          packetLoss: vdoStats.packetLoss,
          latency: vdoStats.rtt,
          bandwidth: {
            upload: vdoStats.availableOutgoingBitrate,
            download: vdoStats.availableIncomingBitrate,
          }
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Listen for stats acknowledgment
  useEffect(() => {
    socket.on('stream:stats:received', (data) => {
      console.log('Stats acknowledged:', data);
    });

    return () => {
      socket.off('stream:stats:received');
    };
  }, [socket]);

  return (
    // Component JSX
  );
}
```

## Analytics Dashboard Integration

```typescript
// For viewing real-time stats
function StreamAnalytics({ streamId }: { streamId: string }) {
  const socket = useSocket();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Request current stats
    socket.emit('stream:stats:get', { streamId });

    // Listen for updates
    socket.on('stream:stats:current', (data) => {
      setStats(data.stats);
    });

    socket.on('stream:stats:update', (data) => {
      if (data.streamId === streamId) {
        setStats(data.stats);
      }
    });

    return () => {
      socket.off('stream:stats:current');
      socket.off('stream:stats:update');
    };
  }, [socket, streamId]);

  return (
    <div>
      {stats && (
        <>
          <div>Bitrate: {stats.bitrate} kbps</div>
          <div>FPS: {stats.fps}</div>
          <div>Resolution: {stats.resolution.width}x{stats.resolution.height}</div>
          <div>Packet Loss: {stats.packetLoss}%</div>
          <div>Latency: {stats.latency}ms</div>
        </>
      )}
    </div>
  );
}
```

## Performance Monitoring

### Quality Indicators
- **Good**: Packet loss < 1%, Latency < 100ms, FPS >= 25
- **Fair**: Packet loss 1-3%, Latency 100-200ms, FPS 20-25
- **Poor**: Packet loss > 3%, Latency > 200ms, FPS < 20

### Automatic Alerts
The system logs warnings when:
- Packet loss exceeds 5%
- FPS drops below 20
- Bitrate drops significantly

## Future Enhancements

1. **Persistent Storage**: Store stats in StreamAnalytics table
2. **Historical Analytics**: Track performance over time
3. **Automated Quality Adjustments**: Reduce quality on poor connection
4. **Viewer Experience Metrics**: Track buffering and quality switches
5. **Alert System**: Notify streamers of quality issues