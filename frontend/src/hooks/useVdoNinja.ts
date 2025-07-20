import { useRef, useEffect, useCallback, useState } from 'react';
import { VdoEventManager, VdoEventHandler, VdoStatsHandler, VdoEvents } from '@/lib/vdo-ninja/event-manager';
import { sendCommand, VdoCommands } from '@/lib/vdo-ninja/commands';
import { generateStreamerUrl, generateViewerUrl } from '@/lib/vdo-ninja/url-generator';
import { VdoStatsTracker, AggregatedStats } from '@/lib/vdo-ninja/stats-tracker';
import { VdoError, VdoErrorHandler, VdoErrorRecovery } from '@/lib/vdo-ninja/errors';
import { 
  VdoCommand, 
  VdoEvent, 
  VdoStats, 
  VdoStreamerParams, 
  VdoViewerParams,
  VdoNinjaConfig 
} from '@/lib/vdo-ninja/types';

export interface UseVdoNinjaOptions {
  mode: 'streamer' | 'viewer';
  params: VdoStreamerParams | VdoViewerParams;
  config?: VdoNinjaConfig;
  onEvent?: VdoEventHandler;
  onStats?: VdoStatsHandler;
  onError?: (error: VdoError) => void;
  onAggregatedStats?: (stats: AggregatedStats) => void;
  autoLoad?: boolean;
  enableStatsTracking?: boolean;
}

export interface UseVdoNinjaReturn {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  url: string;
  isLoaded: boolean;
  isConnected: boolean;
  stats: VdoStats | null;
  aggregatedStats: AggregatedStats | null;
  error: VdoError | null;
  sendCommand: (command: VdoCommand) => void;
  commands: typeof VdoCommands;
  reload: () => void;
  updateUrl: (params: VdoStreamerParams | VdoViewerParams) => void;
  requestStats: () => void;
  exportStats: () => string;
}

export function useVdoNinja(options: UseVdoNinjaOptions): UseVdoNinjaReturn {
  const { 
    mode, 
    params, 
    config, 
    onEvent, 
    onStats, 
    onError,
    onAggregatedStats,
    autoLoad = true,
    enableStatsTracking = true
  } = options;
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const eventManagerRef = useRef<VdoEventManager>(new VdoEventManager());
  const errorHandlerRef = useRef<VdoErrorHandler>(new VdoErrorHandler());
  const statsTrackerRef = useRef<VdoStatsTracker>(new VdoStatsTracker());
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<VdoStats | null>(null);
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats | null>(null);
  const [error, setError] = useState<VdoError | null>(null);
  const [url, setUrl] = useState<string>('');

  // Generate URL based on mode
  useEffect(() => {
    const newUrl = mode === 'streamer' 
      ? generateStreamerUrl(params as VdoStreamerParams, config)
      : generateViewerUrl(params as VdoViewerParams, config);
    setUrl(newUrl);
  }, [mode, params, config]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoaded(true);
    
    if (iframeRef.current) {
      eventManagerRef.current.startListening(iframeRef.current);
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    const eventManager = eventManagerRef.current;
    const errorHandler = errorHandlerRef.current;
    const statsTracker = statsTrackerRef.current;

    // Register custom event handler
    if (onEvent) {
      eventManager.on('*', onEvent);
    }

    // Connection status handler
    eventManager.on(VdoEvents.CONNECTED, () => {
      setIsConnected(true);
      setError(null);
    });

    eventManager.on(VdoEvents.DISCONNECTED, () => {
      setIsConnected(false);
    });

    // Error event handler
    eventManager.on(VdoEvents.ERROR, (event) => {
      const vdoError = errorHandler.parseErrorEvent(event);
      if (vdoError) {
        setError(vdoError);
        if (onError) {
          onError(vdoError);
        }
        errorHandler.handleError(vdoError);
      }
    });

    // Stats handler
    const statsHandler: VdoStatsHandler = (newStats) => {
      setStats(newStats);
      
      if (enableStatsTracking) {
        statsTracker.addStats(newStats);
      }
      
      if (onStats) {
        onStats(newStats);
      }
    };
    eventManager.onStats(statsHandler);

    // Aggregated stats handler
    if (enableStatsTracking && onAggregatedStats) {
      statsTracker.onAggregatedStats((aggStats) => {
        setAggregatedStats(aggStats);
        onAggregatedStats(aggStats);
      });
    }

    // Cleanup
    return () => {
      eventManager.stopListening();
      eventManager.clear();
      errorHandler.clear();
      statsTracker.clear();
    };
  }, [onEvent, onStats, onError, onAggregatedStats, enableStatsTracking]);

  // Send command wrapper
  const sendCommandWrapper = useCallback((command: VdoCommand) => {
    sendCommand(iframeRef.current, command);
  }, []);

  // Reload iframe
  const reload = useCallback(() => {
    if (iframeRef.current) {
      setIsLoaded(false);
      iframeRef.current.src = url;
    }
  }, [url]);

  // Update URL with new params
  const updateUrl = useCallback((newParams: VdoStreamerParams | VdoViewerParams) => {
    const newUrl = mode === 'streamer' 
      ? generateStreamerUrl(newParams as VdoStreamerParams, config)
      : generateViewerUrl(newParams as VdoViewerParams, config);
    setUrl(newUrl);
    
    if (autoLoad && iframeRef.current) {
      setIsLoaded(false);
      iframeRef.current.src = newUrl;
    }
  }, [mode, config, autoLoad]);

  // Auto-load URL when it changes
  useEffect(() => {
    if (autoLoad && url && iframeRef.current) {
      iframeRef.current.src = url;
    }
  }, [url, autoLoad]);

  // Request stats
  const requestStats = useCallback(() => {
    sendCommandWrapper(VdoCommands.requestStats());
  }, [sendCommandWrapper]);

  // Export stats
  const exportStats = useCallback(() => {
    return statsTrackerRef.current.exportToCSV();
  }, []);

  return {
    iframeRef,
    url,
    isLoaded,
    isConnected,
    stats,
    aggregatedStats,
    error,
    sendCommand: sendCommandWrapper,
    commands: VdoCommands,
    reload,
    updateUrl,
    requestStats,
    exportStats,
  };
}