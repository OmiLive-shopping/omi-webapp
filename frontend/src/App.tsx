import { useState, useEffect, useRef } from 'react';
import './App.css';

interface VDOMessage {
  type: string;
  data?: Record<string, unknown> | string | number | boolean;
}

function App() {
  const [streamKey, setStreamKey] = useState('teststream123');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [publisherReady, setPublisherReady] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  
  const publisherRef = useRef<HTMLIFrameElement>(null);
  const viewerRef = useRef<HTMLIFrameElement>(null);

  // VDO.ninja URLs
  const publisherUrl = `https://vdo.ninja/?push=${streamKey}&meshcast&webcam&autostart=0&bitrate=2500&nopreview`;
  const viewerUrl = `https://vdo.ninja/?view=${streamKey}&scene&autostart=1`;

  // Log message helper
  const logMessage = (msg: string) => {
    console.log(`[VDO Test] ${msg}`);
    setMessages(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Setup postMessage listeners
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from VDO.ninja
      if (!event.origin.includes('vdo.ninja')) return;

      const message = event.data as VDOMessage;
      logMessage(`Received: ${message.type} ${JSON.stringify(message.data || '')}`);

      // Handle different message types
      switch (message.type) {
        case 'ready':
          if (event.source === publisherRef.current?.contentWindow) {
            setPublisherReady(true);
            logMessage('Publisher iframe ready');
          } else if (event.source === viewerRef.current?.contentWindow) {
            setViewerReady(true);
            logMessage('Viewer iframe ready');
          }
          break;
        
        case 'connected':
          setConnectionStatus('connected');
          logMessage('Stream connected to Meshcast');
          break;
        
        case 'disconnected':
          setConnectionStatus('disconnected');
          logMessage('Stream disconnected');
          break;
        
        case 'stats':
          logMessage(`Stats: ${JSON.stringify(message.data)}`);
          break;
        
        default:
          logMessage(`Unknown message type: ${message.type}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send command to VDO.ninja iframe
  const sendCommand = (iframe: HTMLIFrameElement | null, command: string, data?: Record<string, unknown>) => {
    if (!iframe || !iframe.contentWindow) {
      logMessage('Iframe not ready');
      return;
    }
    
    const message = { type: command, data };
    logMessage(`Sending: ${command} ${JSON.stringify(data || '')}`);
    iframe.contentWindow.postMessage(message, 'https://vdo.ninja');
  };

  // Control handlers
  const toggleMic = () => {
    const newState = !micEnabled;
    setMicEnabled(newState);
    sendCommand(publisherRef.current, 'mic', { enabled: newState });
  };

  const toggleCamera = () => {
    const newState = !cameraEnabled;
    setCameraEnabled(newState);
    sendCommand(publisherRef.current, 'camera', { enabled: newState });
  };

  const startStream = () => {
    setConnectionStatus('connecting');
    sendCommand(publisherRef.current, 'start');
  };

  const stopStream = () => {
    sendCommand(publisherRef.current, 'stop');
    setConnectionStatus('disconnected');
  };

  const updateStreamKey = () => {
    // Reload iframes with new stream key
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
          VDO.ninja Meshcast Test
        </h1>

        {/* Controls Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
            Stream Controls
          </h2>
          
          <div className="space-y-4">
            {/* Stream Key Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="Enter stream key"
                className="flex-1 px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={updateStreamKey}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
              >
                Update Key
              </button>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-300">Status:</span>
              <span className={`font-semibold ${
                connectionStatus === 'connected' ? 'text-green-500' :
                connectionStatus === 'connecting' ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {connectionStatus.toUpperCase()}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={startStream}
                disabled={connectionStatus === 'connected'}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Start Stream
              </button>
              <button
                onClick={stopStream}
                disabled={connectionStatus === 'disconnected'}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Stop Stream
              </button>
              <button
                onClick={toggleMic}
                className={`px-4 py-2 rounded-md transition ${
                  micEnabled 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {micEnabled ? '🎤 Mic ON' : '🎤 Mic OFF'}
              </button>
              <button
                onClick={toggleCamera}
                className={`px-4 py-2 rounded-md transition ${
                  cameraEnabled 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {cameraEnabled ? '📹 Camera ON' : '📹 Camera OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Video Frames */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Publisher Frame */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                Publisher (Your Stream)
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {publisherReady ? '✅ Ready' : '⏳ Loading...'}
              </p>
            </div>
            <div className="relative aspect-video bg-black">
              <iframe
                ref={publisherRef}
                src={publisherUrl}
                className="absolute inset-0 w-full h-full"
                allow="camera; microphone; autoplay"
                title="Publisher"
              />
            </div>
          </div>

          {/* Viewer Frame */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200">
                Viewer (What Others See)
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {viewerReady ? '✅ Ready' : '⏳ Loading...'}
              </p>
            </div>
            <div className="relative aspect-video bg-black">
              <iframe
                ref={viewerRef}
                src={viewerUrl}
                className="absolute inset-0 w-full h-full"
                allow="autoplay"
                title="Viewer"
              />
            </div>
          </div>
        </div>

        {/* Message Log */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="font-semibold mb-4 text-gray-700 dark:text-gray-200">
            PostMessage Log
          </h3>
          <div className="bg-gray-100 dark:bg-gray-900 rounded p-4 h-48 overflow-y-auto font-mono text-sm">
            {messages.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No messages yet...</p>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="text-gray-700 dark:text-gray-300">
                  {msg}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;