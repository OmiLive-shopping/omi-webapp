import React, { useState } from 'react';
import { 
  Layout, 
  Video, 
  Control, 
  Button, 
  Switch, 
  Select,
  Card,
  Tabs,
  Icon,
  Badge,
  Text,
  Heading
} from '@bolt/ui'; // UI component library

interface StreamerStudioProps {
  streamKey: string;
  onStreamStart: () => void;
  onStreamEnd: () => void;
}

interface StreamSettings {
  camera: boolean;
  microphone: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  bitrate: number;
}

export const StreamerStudio: React.FC<StreamerStudioProps> = ({
  streamKey,
  onStreamStart,
  onStreamEnd
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [settings, setSettings] = useState<StreamSettings>({
    camera: true,
    microphone: true,
    quality: 'high',
    bitrate: 2500
  });
  const [streamStats, setStreamStats] = useState({
    viewers: 0,
    duration: '00:00:00',
    fps: 30,
    bitrate: 0
  });

  const handleStreamStart = () => {
    setIsStreaming(true);
    onStreamStart();
  };

  const handleStreamEnd = () => {
    setIsStreaming(false);
    onStreamEnd();
  };

  const qualityOptions = [
    { value: 'low', label: 'Low (480p)' },
    { value: 'medium', label: 'Medium (720p)' },
    { value: 'high', label: 'High (1080p)' },
    { value: 'ultra', label: 'Ultra (4K)' }
  ];

  return (
    <Layout.Grid cols={12} gap={4} className="h-full p-4">
      {/* Main Video Area */}
      <Layout.GridItem span={8} className="h-full">
        <Card className="h-full">
          <Card.Header>
            <div className="flex items-center justify-between">
              <Heading size="md">Stream Preview</Heading>
              {isStreaming && (
                <Badge variant="danger" pulse>
                  <Icon name="radio" size="sm" className="mr-1" />
                  LIVE
                </Badge>
              )}
            </div>
          </Card.Header>
          <Card.Body className="p-0 relative">
            <Video.Player
              src={`https://vdo.ninja/?push=${streamKey}&meshcast&webcam&bitrate=${settings.bitrate}`}
              controls={false}
              allowFullScreen
              className="w-full h-full aspect-video bg-black"
            />
            {/* Stream Stats Overlay */}
            <div className="absolute top-4 left-4 bg-black/75 p-2 rounded">
              <div className="flex items-center gap-4 text-white text-sm">
                <span>FPS: {streamStats.fps}</span>
                <span>Bitrate: {streamStats.bitrate} kbps</span>
                <span>Duration: {streamStats.duration}</span>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Layout.GridItem>
      
      {/* Controls Sidebar */}
      <Layout.GridItem span={4} className="h-full">
        <div className="space-y-4">
          {/* Stream Controls */}
          <Control.Panel title="Stream Controls">
            <Control.Group>
              <Switch 
                label="Camera" 
                checked={settings.camera}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, camera: checked }))
                }
              />
              <Switch 
                label="Microphone" 
                checked={settings.microphone}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, microphone: checked }))
                }
              />
            </Control.Group>
            
            <Control.Divider />
            
            <Control.Group label="Stream Quality">
              <Select
                value={settings.quality}
                onValueChange={(value) => {
                  const bitrateMap = {
                    low: 1000,
                    medium: 2000,
                    high: 2500,
                    ultra: 5000
                  };
                  setSettings(prev => ({ 
                    ...prev, 
                    quality: value as StreamSettings['quality'],
                    bitrate: bitrateMap[value as keyof typeof bitrateMap]
                  }));
                }}
                options={qualityOptions}
              />
            </Control.Group>
            
            <Control.Divider />
            
            {!isStreaming ? (
              <Button 
                variant="primary" 
                size="lg" 
                fullWidth
                onClick={handleStreamStart}
                leftIcon={<Icon name="video" />}
              >
                Start Streaming
              </Button>
            ) : (
              <Button 
                variant="danger" 
                size="lg" 
                fullWidth
                onClick={handleStreamEnd}
                leftIcon={<Icon name="stop-circle" />}
              >
                End Stream
              </Button>
            )}
          </Control.Panel>

          {/* Stream Stats */}
          <Card>
            <Card.Header>
              <Heading size="sm">Stream Statistics</Heading>
            </Card.Header>
            <Card.Body>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text variant="muted">Viewers</Text>
                  <Badge variant="secondary">
                    <Icon name="users" size="xs" className="mr-1" />
                    {streamStats.viewers}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <Text variant="muted">Duration</Text>
                  <Text>{streamStats.duration}</Text>
                </div>
                <div className="flex justify-between">
                  <Text variant="muted">FPS</Text>
                  <Text>{streamStats.fps}</Text>
                </div>
                <div className="flex justify-between">
                  <Text variant="muted">Bitrate</Text>
                  <Text>{streamStats.bitrate} kbps</Text>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Additional Settings */}
          <Tabs defaultValue="products">
            <Tabs.List>
              <Tabs.Trigger value="products">Products</Tabs.Trigger>
              <Tabs.Trigger value="chat">Chat</Tabs.Trigger>
              <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
            </Tabs.List>
            
            <Tabs.Content value="products" className="mt-4">
              <Card>
                <Card.Body>
                  <Text variant="muted" className="text-center py-8">
                    Product management panel coming soon
                  </Text>
                </Card.Body>
              </Card>
            </Tabs.Content>
            
            <Tabs.Content value="chat" className="mt-4">
              <Card>
                <Card.Body>
                  <Text variant="muted" className="text-center py-8">
                    Chat moderation tools coming soon
                  </Text>
                </Card.Body>
              </Card>
            </Tabs.Content>
            
            <Tabs.Content value="settings" className="mt-4">
              <Card>
                <Card.Body>
                  <Text variant="muted" className="text-center py-8">
                    Advanced settings coming soon
                  </Text>
                </Card.Body>
              </Card>
            </Tabs.Content>
          </Tabs>
        </div>
      </Layout.GridItem>
    </Layout.Grid>
  );
};