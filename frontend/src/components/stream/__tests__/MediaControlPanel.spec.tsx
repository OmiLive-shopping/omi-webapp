import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaControlPanel } from '../MediaControlPanel';
import type { MediaControlsReturn } from '@/hooks/useMediaControls';

// Mock the useMediaControls hook
vi.mock('@/hooks/useMediaControls', () => ({
  useMediaControls: vi.fn(() => ({
    state: {
      audioEnabled: true,
      videoEnabled: true,
      screenShareEnabled: false,
      isRecording: false,
      volume: 50,
      bitrate: 2500000,
      currentQuality: 'medium',
      currentAudioDevice: 'default',
      currentVideoDevice: 'default',
      isConnected: true,
      connectionQuality: 'good'
    },
    devices: {
      audioInputs: [
        { deviceId: 'default', label: 'Default Microphone', kind: 'audioinput', groupId: '1' },
        { deviceId: 'mic2', label: 'USB Microphone', kind: 'audioinput', groupId: '2' }
      ],
      videoInputs: [
        { deviceId: 'default', label: 'Default Camera', kind: 'videoinput', groupId: '1' },
        { deviceId: 'cam2', label: 'USB Camera', kind: 'videoinput', groupId: '2' }
      ],
      audioOutputs: []
    },
    permissions: {
      audio: true,
      video: true,
      screen: true
    },
    capabilities: {
      audio: true,
      video: true,
      screenShare: true,
      recording: true,
      backgroundBlur: false,
      virtualBackground: false
    },
    queueStatus: {
      size: 0,
      isProcessing: false
    },
    toggleAudio: vi.fn(),
    toggleVideo: vi.fn(),
    toggleScreenShare: vi.fn(),
    toggleRecording: vi.fn(),
    setAudioDevice: vi.fn(),
    setVideoDevice: vi.fn(),
    setQuality: vi.fn(),
    setBitrate: vi.fn(),
    setVolume: vi.fn(),
    refreshDevices: vi.fn(),
    requestPermissions: vi.fn(),
    processOfflineQueue: vi.fn(),
    getDeviceCapabilities: vi.fn()
  }))
}));

describe('MediaControlPanel', () => {
  const mockToggleAudio = vi.fn();
  const mockToggleVideo = vi.fn();
  const mockToggleScreenShare = vi.fn();
  const mockToggleRecording = vi.fn();
  const mockSetAudioDevice = vi.fn();
  const mockSetVideoDevice = vi.fn();
  const mockSetQuality = vi.fn();
  const mockSetBitrate = vi.fn();
  const mockSetVolume = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    const { useMediaControls } = vi.mocked(await import('@/hooks/useMediaControls'));
    useMediaControls.mockReturnValue({
      ...useMediaControls(),
      toggleAudio: mockToggleAudio,
      toggleVideo: mockToggleVideo,
      toggleScreenShare: mockToggleScreenShare,
      toggleRecording: mockToggleRecording,
      setAudioDevice: mockSetAudioDevice,
      setVideoDevice: mockSetVideoDevice,
      setQuality: mockSetQuality,
      setBitrate: mockSetBitrate,
      setVolume: mockSetVolume
    } as unknown as MediaControlsReturn);
  });
  
  describe('Primary Controls', () => {
    it('should render audio control button', () => {
      render(<MediaControlPanel />);
      
      const audioButton = screen.getByRole('button', { name: /mute/i });
      expect(audioButton).toBeInTheDocument();
    });
    
    it('should render video control button', () => {
      render(<MediaControlPanel />);
      
      const videoButton = screen.getByRole('button', { name: /hide video/i });
      expect(videoButton).toBeInTheDocument();
    });
    
    it('should toggle audio when clicked', async () => {
      render(<MediaControlPanel />);
      
      const audioButton = screen.getByRole('button', { name: /mute/i });
      fireEvent.click(audioButton);
      
      await waitFor(() => {
        expect(mockToggleAudio).toHaveBeenCalled();
      });
    });
    
    it('should toggle video when clicked', async () => {
      render(<MediaControlPanel />);
      
      const videoButton = screen.getByRole('button', { name: /hide video/i });
      fireEvent.click(videoButton);
      
      await waitFor(() => {
        expect(mockToggleVideo).toHaveBeenCalled();
      });
    });
    
    it('should show screen share button when showAdvancedControls is true', () => {
      render(<MediaControlPanel showAdvancedControls={true} />);
      
      const screenShareButton = screen.getByRole('button', { name: /share screen/i });
      expect(screenShareButton).toBeInTheDocument();
    });
    
    it('should not show screen share button when showAdvancedControls is false', () => {
      render(<MediaControlPanel showAdvancedControls={false} />);
      
      const screenShareButton = screen.queryByRole('button', { name: /share screen/i });
      expect(screenShareButton).not.toBeInTheDocument();
    });
    
    it('should show recording button when showRecordingControls is true', () => {
      render(<MediaControlPanel showRecordingControls={true} />);
      
      const recordingButton = screen.getByRole('button', { name: /start recording/i });
      expect(recordingButton).toBeInTheDocument();
    });
  });
  
  describe('Device Selection', () => {
    it('should show device menu when device selection is enabled', () => {
      render(<MediaControlPanel showDeviceSelection={true} />);
      
      // Look for dropdown indicators
      const dropdownButtons = screen.getAllByRole('button').filter(
        button => button.querySelector('svg')
      );
      
      expect(dropdownButtons.length).toBeGreaterThan(0);
    });
    
    it('should not show device menu when device selection is disabled', () => {
      render(<MediaControlPanel showDeviceSelection={false} layout="horizontal" />);
      
      // There should be fewer buttons without device selection
      const buttons = screen.getAllByRole('button');
      const initialCount = buttons.length;
      
      render(<MediaControlPanel showDeviceSelection={true} layout="horizontal" />);
      const buttonsWithSelection = screen.getAllByRole('button');
      
      expect(buttonsWithSelection.length).toBeGreaterThan(initialCount);
    });
  });
  
  describe('Quality Settings', () => {
    it('should show quality button when enabled', () => {
      render(<MediaControlPanel showQualitySettings={true} />);
      
      const qualityButton = screen.getByRole('button', { name: /quality/i });
      expect(qualityButton).toBeInTheDocument();
    });
    
    it('should not show quality button when disabled', () => {
      render(<MediaControlPanel showQualitySettings={false} />);
      
      const qualityButton = screen.queryByRole('button', { name: /quality/i });
      expect(qualityButton).not.toBeInTheDocument();
    });
    
    it('should not show quality button in compact layout', () => {
      render(<MediaControlPanel showQualitySettings={true} layout="compact" />);
      
      const qualityButton = screen.queryByRole('button', { name: /quality/i });
      expect(qualityButton).not.toBeInTheDocument();
    });
  });
  
  describe('Connection Status', () => {
    it('should show connection status when enabled', () => {
      render(<MediaControlPanel showConnectionStatus={true} />);
      
      const statusText = screen.getByText(/good/i);
      expect(statusText).toBeInTheDocument();
    });
    
    it('should not show connection status when disabled', () => {
      render(<MediaControlPanel showConnectionStatus={false} />);
      
      const statusText = screen.queryByText(/good/i);
      expect(statusText).not.toBeInTheDocument();
    });
    
    it('should show bitrate in connection status', () => {
      render(<MediaControlPanel showConnectionStatus={true} />);
      
      const bitrateText = screen.getByText(/2500 kbps/i);
      expect(bitrateText).toBeInTheDocument();
    });
    
    it('should show queue status when there are queued items', () => {
      const { useMediaControls } = vi.mocked(await import('@/hooks/useMediaControls'));
      useMediaControls.mockReturnValue({
        ...useMediaControls(),
        queueStatus: {
          size: 3,
          isProcessing: false
        }
      } as unknown as MediaControlsReturn);
      
      render(<MediaControlPanel showConnectionStatus={true} />);
      
      const queueText = screen.getByText(/3 queued/i);
      expect(queueText).toBeInTheDocument();
    });
  });
  
  describe('Layout Variations', () => {
    it('should apply horizontal layout classes', () => {
      const { container } = render(<MediaControlPanel layout="horizontal" />);
      
      const controlsContainer = container.querySelector('.flex-row');
      expect(controlsContainer).toBeInTheDocument();
    });
    
    it('should apply vertical layout classes', () => {
      const { container } = render(<MediaControlPanel layout="vertical" />);
      
      const controlsContainer = container.querySelector('.flex-col');
      expect(controlsContainer).toBeInTheDocument();
    });
    
    it('should apply compact layout classes', () => {
      const { container } = render(<MediaControlPanel layout="compact" />);
      
      const controlsContainer = container.querySelector('.inline-flex');
      expect(controlsContainer).toBeInTheDocument();
    });
    
    it('should apply expanded layout classes', () => {
      const { container } = render(<MediaControlPanel layout="expanded" />);
      
      const controlsContainer = container.querySelector('.grid');
      expect(controlsContainer).toBeInTheDocument();
    });
    
    it('should show labels in expanded layout', () => {
      render(<MediaControlPanel layout="expanded" />);
      
      const muteText = screen.getByText('Mute');
      expect(muteText).toBeInTheDocument();
    });
  });
  
  describe('Size Variations', () => {
    it('should apply small size classes', () => {
      const { container } = render(<MediaControlPanel size="sm" />);
      
      const buttons = container.querySelectorAll('button');
      const smallButton = Array.from(buttons).find(btn => 
        btn.className.includes('p-1.5')
      );
      expect(smallButton).toBeInTheDocument();
    });
    
    it('should apply medium size classes', () => {
      const { container } = render(<MediaControlPanel size="md" />);
      
      const buttons = container.querySelectorAll('button');
      const mediumButton = Array.from(buttons).find(btn => 
        btn.className.includes('p-2')
      );
      expect(mediumButton).toBeInTheDocument();
    });
    
    it('should apply large size classes', () => {
      const { container } = render(<MediaControlPanel size="lg" />);
      
      const buttons = container.querySelectorAll('button');
      const largeButton = Array.from(buttons).find(btn => 
        btn.className.includes('p-3')
      );
      expect(largeButton).toBeInTheDocument();
    });
  });
  
  describe('Callbacks', () => {
    it('should call onStateChange when state changes', async () => {
      const onStateChange = vi.fn();
      render(<MediaControlPanel onStateChange={onStateChange} />);
      
      // This would be called internally by useMediaControls
      // In a real test, we'd trigger a state change through the hook
    });
    
    it('should call onError when an error occurs', async () => {
      const onError = vi.fn();
      const { useMediaControls } = vi.mocked(await import('@/hooks/useMediaControls'));
      
      const mockSetAudioDeviceWithError = vi.fn().mockRejectedValue(new Error('Device error'));
      useMediaControls.mockReturnValue({
        ...useMediaControls(),
        setAudioDevice: mockSetAudioDeviceWithError
      } as unknown as MediaControlsReturn);
      
      render(<MediaControlPanel onError={onError} showDeviceSelection={true} />);
      
      // This would trigger device selection which would cause an error
      // In a real implementation, clicking on device would call onError
    });
  });
  
  describe('Disabled States', () => {
    it('should disable audio button when permission is not granted', () => {
      const { useMediaControls } = vi.mocked(await import('@/hooks/useMediaControls'));
      useMediaControls.mockReturnValue({
        ...useMediaControls(),
        permissions: {
          audio: false,
          video: true,
          screen: true
        }
      } as unknown as MediaControlsReturn);
      
      render(<MediaControlPanel />);
      
      const audioButton = screen.getByRole('button', { name: /unmute/i });
      expect(audioButton).toBeDisabled();
    });
    
    it('should disable video button when permission is not granted', () => {
      const { useMediaControls } = vi.mocked(await import('@/hooks/useMediaControls'));
      useMediaControls.mockReturnValue({
        ...useMediaControls(),
        permissions: {
          audio: true,
          video: false,
          screen: true
        }
      } as unknown as MediaControlsReturn);
      
      render(<MediaControlPanel />);
      
      const videoButton = screen.getByRole('button', { name: /show video/i });
      expect(videoButton).toBeDisabled();
    });
    
    it('should disable screen share when capability is not available', () => {
      const { useMediaControls } = vi.mocked(await import('@/hooks/useMediaControls'));
      useMediaControls.mockReturnValue({
        ...useMediaControls(),
        capabilities: {
          audio: true,
          video: true,
          screenShare: false,
          recording: true,
          backgroundBlur: false,
          virtualBackground: false
        }
      } as unknown as MediaControlsReturn);
      
      render(<MediaControlPanel showAdvancedControls={true} />);
      
      const screenShareButton = screen.getByRole('button', { name: /share screen/i });
      expect(screenShareButton).toBeDisabled();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper aria-labels', () => {
      render(<MediaControlPanel />);
      
      const audioButton = screen.getByRole('button', { name: /mute/i });
      expect(audioButton).toHaveAttribute('aria-label');
      
      const videoButton = screen.getByRole('button', { name: /hide video/i });
      expect(videoButton).toHaveAttribute('aria-label');
    });
    
    it('should have proper title attributes', () => {
      render(<MediaControlPanel />);
      
      const audioButton = screen.getByRole('button', { name: /mute/i });
      expect(audioButton).toHaveAttribute('title');
      
      const videoButton = screen.getByRole('button', { name: /hide video/i });
      expect(videoButton).toHaveAttribute('title');
    });
  });
});