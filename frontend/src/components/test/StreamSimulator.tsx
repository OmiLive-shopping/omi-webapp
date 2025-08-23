import { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Square, MessageSquare, Users, Activity } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

export const StreamSimulator = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  // Check simulation status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/v1/streams/test/simulate/status`);
      setSimulationStatus(data.data);
      setIsSimulating(data.data.simulationActive);
    } catch (error) {
      console.error('Failed to check simulation status:', error);
    }
  };

  const startSimulation = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/v1/streams/test/simulate/start`);
      if (data.success) {
        setIsSimulating(true);
        setSimulationStatus(data.data);
        // Reload the page to see the live stream
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to start simulation:', error);
      alert('Failed to start simulation. Make sure you have at least one stream in the database.');
    } finally {
      setLoading(false);
    }
  };

  const stopSimulation = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/v1/streams/test/simulate/stop`);
      if (data.success) {
        setIsSimulating(false);
        setSimulationStatus(null);
        // Reload the page to see the updated state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to stop simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!customMessage.trim() || !simulationStatus?.currentStreamId) return;
    
    try {
      await axios.post(`${API_URL}/v1/streams/test/simulate/chat`, {
        streamId: simulationStatus.currentStreamId,
        message: customMessage,
        username: 'TestUser'
      });
      setCustomMessage('');
    } catch (error) {
      console.error('Failed to send test message:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Stream Simulator
          </h3>
          <span className={`text-xs px-2 py-1 rounded ${isSimulating ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
            {isSimulating ? 'Active' : 'Inactive'}
          </span>
        </div>

        {simulationStatus?.currentStreamId && (
          <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
            <p className="text-gray-600 dark:text-gray-300">
              Simulating: <span className="font-medium">{simulationStatus.currentStreamTitle}</span>
            </p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              ID: {simulationStatus.currentStreamId.slice(0, 8)}...
            </p>
          </div>
        )}

        <div className="space-y-3">
          {!isSimulating ? (
            <button
              onClick={startSimulation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Start Simulation
            </button>
          ) : (
            <>
              <button
                onClick={stopSimulation}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                Stop Simulation
              </button>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Send Test Message:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                  <button
                    onClick={sendTestMessage}
                    className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm"
                  >
                    Send
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Chat messages every 2s
                </p>
                <p className="flex items-center gap-1 mt-1">
                  <Users className="w-3 h-3" />
                  Random viewer count changes
                </p>
              </div>
            </>
          )}
        </div>

        {!isSimulating && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            This will make the first stream in your database go live with simulated chat activity.
          </p>
        )}
      </div>
    </div>
  );
};