import { VdoHelpResponse, VdoHelpCategories } from './websocket-feedback';
import { VdoCommands } from './commands';

/**
 * VDO.Ninja Command Help System
 * Provides comprehensive help and documentation for all VDO commands
 */
export class VdoCommandHelpSystem {
  private commandDatabase: Map<string, CommandHelpEntry> = new Map();
  private categories: Map<string, CategoryEntry> = new Map();
  
  constructor() {
    this.initializeDatabase();
    this.initializeCategories();
  }
  
  /**
   * Initialize command database
   */
  private initializeDatabase(): void {
    // Stream Control Commands
    this.addCommand({
      command: 'start-stream',
      category: 'stream',
      description: 'Start broadcasting your stream',
      syntax: 'startStream(options?)',
      parameters: [
        { name: 'roomId', type: 'string', required: false, description: 'Custom room ID' },
        { name: 'password', type: 'string', required: false, description: 'Room password' },
        { name: 'quality', type: 'string', required: false, description: 'Initial quality preset', default: 'medium' }
      ],
      examples: [
        'VdoCommands.startStream()',
        'VdoCommands.startStream({ roomId: "my-room", quality: "high" })'
      ],
      permissions: ['camera', 'microphone'],
      relatedCommands: ['stop-stream', 'pause-stream', 'resume-stream']
    });
    
    this.addCommand({
      command: 'stop-stream',
      category: 'stream',
      description: 'Stop broadcasting and end the stream',
      syntax: 'stopStream()',
      parameters: [],
      examples: ['VdoCommands.stopStream()'],
      permissions: [],
      relatedCommands: ['start-stream', 'pause-stream']
    });
    
    this.addCommand({
      command: 'pause-stream',
      category: 'stream',
      description: 'Temporarily pause the stream without disconnecting',
      syntax: 'pauseStream()',
      parameters: [],
      examples: ['VdoCommands.pauseStream()'],
      permissions: [],
      relatedCommands: ['resume-stream', 'stop-stream']
    });
    
    // Audio Commands
    this.addCommand({
      command: 'mute-audio',
      category: 'audio',
      description: 'Mute your microphone',
      syntax: 'muteAudio()',
      parameters: [],
      examples: ['VdoCommands.muteAudio()'],
      permissions: [],
      relatedCommands: ['unmute-audio', 'toggle-audio', 'set-volume']
    });
    
    this.addCommand({
      command: 'set-volume',
      category: 'audio',
      description: 'Set the audio output volume',
      syntax: 'setVolume(level)',
      parameters: [
        { name: 'level', type: 'number', required: true, description: 'Volume level (0-100)' }
      ],
      examples: [
        'VdoCommands.setVolume(50)',
        'VdoCommands.setVolume(100)'
      ],
      permissions: [],
      relatedCommands: ['mute-audio', 'set-audio-gain']
    });
    
    this.addCommand({
      command: 'set-audio-gain',
      category: 'audio',
      description: 'Adjust microphone input gain',
      syntax: 'setAudioGain(gain)',
      parameters: [
        { name: 'gain', type: 'number', required: true, description: 'Gain multiplier (0.1-10)', default: 1 }
      ],
      examples: [
        'VdoCommands.setAudioGain(2)',
        'VdoCommands.setAudioGain(0.5)'
      ],
      permissions: ['microphone'],
      relatedCommands: ['set-volume', 'set-noise-suppression']
    });
    
    this.addCommand({
      command: 'set-noise-suppression',
      category: 'audio',
      description: 'Enable or disable noise suppression',
      syntax: 'setNoiseSuppression(enabled)',
      parameters: [
        { name: 'enabled', type: 'boolean', required: true, description: 'Enable noise suppression' }
      ],
      examples: [
        'VdoCommands.setNoiseSuppression(true)',
        'VdoCommands.setNoiseSuppression(false)'
      ],
      permissions: ['microphone'],
      relatedCommands: ['set-echo-cancellation', 'set-audio-gain']
    });
    
    // Video Commands
    this.addCommand({
      command: 'hide-video',
      category: 'video',
      description: 'Hide your camera video',
      syntax: 'hideVideo()',
      parameters: [],
      examples: ['VdoCommands.hideVideo()'],
      permissions: [],
      relatedCommands: ['show-video', 'toggle-video']
    });
    
    this.addCommand({
      command: 'set-resolution',
      category: 'video',
      description: 'Set video resolution',
      syntax: 'setResolution(width, height)',
      parameters: [
        { name: 'width', type: 'number', required: true, description: 'Width in pixels' },
        { name: 'height', type: 'number', required: true, description: 'Height in pixels' }
      ],
      examples: [
        'VdoCommands.setResolution(1920, 1080)',
        'VdoCommands.setResolution(1280, 720)',
        'VdoCommands.setResolution(640, 480)'
      ],
      permissions: ['camera'],
      relatedCommands: ['set-framerate', 'set-bitrate', 'set-quality']
    });
    
    this.addCommand({
      command: 'set-framerate',
      category: 'video',
      description: 'Set video framerate',
      syntax: 'setFramerate(fps)',
      parameters: [
        { name: 'fps', type: 'number', required: true, description: 'Frames per second (1-60)', default: 30 }
      ],
      examples: [
        'VdoCommands.setFramerate(30)',
        'VdoCommands.setFramerate(60)',
        'VdoCommands.setFramerate(24)'
      ],
      permissions: ['camera'],
      relatedCommands: ['set-resolution', 'set-bitrate']
    });
    
    this.addCommand({
      command: 'set-bitrate',
      category: 'video',
      description: 'Set video bitrate for quality control',
      syntax: 'setBitrate(bitrate)',
      parameters: [
        { name: 'bitrate', type: 'number', required: true, description: 'Bitrate in bits per second' }
      ],
      examples: [
        'VdoCommands.setBitrate(2500000)',
        'VdoCommands.setBitrate(5000000)',
        'VdoCommands.setBitrate(1000000)'
      ],
      permissions: [],
      relatedCommands: ['set-quality', 'set-resolution']
    });
    
    // Effects Commands
    this.addCommand({
      command: 'set-blur',
      category: 'effects',
      description: 'Apply blur effect to video',
      syntax: 'setBlur(enabled, strength?)',
      parameters: [
        { name: 'enabled', type: 'boolean', required: true, description: 'Enable blur effect' },
        { name: 'strength', type: 'number', required: false, description: 'Blur strength (1-20)', default: 10 }
      ],
      examples: [
        'VdoCommands.setBlur(true)',
        'VdoCommands.setBlur(true, 15)',
        'VdoCommands.setBlur(false)'
      ],
      permissions: ['camera'],
      relatedCommands: ['set-mirror', 'set-rotation', 'set-virtual-background']
    });
    
    this.addCommand({
      command: 'set-virtual-background',
      category: 'effects',
      description: 'Apply virtual background to video',
      syntax: 'setVirtualBackground(type, value?)',
      parameters: [
        { name: 'type', type: 'string', required: true, description: 'Background type: "blur", "image", "none"' },
        { name: 'value', type: 'string', required: false, description: 'Image URL or blur strength' }
      ],
      examples: [
        'VdoCommands.setVirtualBackground("blur")',
        'VdoCommands.setVirtualBackground("image", "https://example.com/bg.jpg")',
        'VdoCommands.setVirtualBackground("none")'
      ],
      permissions: ['camera'],
      relatedCommands: ['set-blur', 'set-green-screen']
    });
    
    // Screen Share Commands
    this.addCommand({
      command: 'start-screenshare',
      category: 'screenshare',
      description: 'Start sharing your screen',
      syntax: 'startScreenShare(options?)',
      parameters: [
        { name: 'audio', type: 'boolean', required: false, description: 'Include system audio', default: false },
        { name: 'quality', type: 'string', required: false, description: 'Quality preset', default: 'high' }
      ],
      examples: [
        'VdoCommands.startScreenShare()',
        'VdoCommands.startScreenShare({ audio: true })',
        'VdoCommands.startScreenShare({ quality: "max" })'
      ],
      permissions: ['screen'],
      relatedCommands: ['stop-screenshare', 'set-screenshare-quality']
    });
    
    // Recording Commands
    this.addCommand({
      command: 'start-recording',
      category: 'recording',
      description: 'Start recording the stream',
      syntax: 'startRecording(options?)',
      parameters: [
        { name: 'format', type: 'string', required: false, description: 'Recording format', default: 'webm' },
        { name: 'quality', type: 'string', required: false, description: 'Recording quality', default: 'high' }
      ],
      examples: [
        'VdoCommands.startRecording()',
        'VdoCommands.startRecording({ format: "mp4" })',
        'VdoCommands.startRecording({ quality: "max" })'
      ],
      permissions: [],
      relatedCommands: ['stop-recording', 'pause-recording', 'download-recording']
    });
    
    // Device Commands
    this.addCommand({
      command: 'set-camera',
      category: 'devices',
      description: 'Switch to a different camera',
      syntax: 'setCamera(deviceId)',
      parameters: [
        { name: 'deviceId', type: 'string', required: true, description: 'Camera device ID' }
      ],
      examples: [
        'VdoCommands.setCamera("camera_id_123")',
        'VdoCommands.setCamera("front_camera")'
      ],
      permissions: ['camera'],
      relatedCommands: ['set-microphone', 'get-devices']
    });
    
    this.addCommand({
      command: 'set-microphone',
      category: 'devices',
      description: 'Switch to a different microphone',
      syntax: 'setMicrophone(deviceId)',
      parameters: [
        { name: 'deviceId', type: 'string', required: true, description: 'Microphone device ID' }
      ],
      examples: [
        'VdoCommands.setMicrophone("mic_id_456")',
        'VdoCommands.setMicrophone("headset_mic")'
      ],
      permissions: ['microphone'],
      relatedCommands: ['set-camera', 'set-speaker', 'get-devices']
    });
    
    // Chat Commands
    this.addCommand({
      command: 'send-chat',
      category: 'chat',
      description: 'Send a chat message',
      syntax: 'sendChat(message)',
      parameters: [
        { name: 'message', type: 'string', required: true, description: 'Chat message text' }
      ],
      examples: [
        'VdoCommands.sendChat("Hello everyone!")',
        'VdoCommands.sendChat("Thanks for watching!")'
      ],
      permissions: [],
      relatedCommands: ['toggle-chat', 'clear-chat']
    });
    
    // Director Commands
    this.addCommand({
      command: 'add-to-scene',
      category: 'director',
      description: 'Add a participant to the scene (director mode)',
      syntax: 'addToScene(participantId)',
      parameters: [
        { name: 'participantId', type: 'string', required: true, description: 'Participant ID to add' }
      ],
      examples: [
        'VdoCommands.addToScene("participant_123")',
        'VdoCommands.addToScene("guest_456")'
      ],
      permissions: [],
      relatedCommands: ['remove-from-scene', 'spotlight', 'switch-scene']
    });
  }
  
  /**
   * Initialize categories
   */
  private initializeCategories(): void {
    this.categories.set('stream', {
      name: 'Stream Control',
      description: 'Commands for managing stream lifecycle',
      icon: '📡',
      commands: ['start-stream', 'stop-stream', 'pause-stream', 'resume-stream', 'toggle-stream']
    });
    
    this.categories.set('audio', {
      name: 'Audio Control',
      description: 'Commands for audio management',
      icon: '🔊',
      commands: ['mute-audio', 'unmute-audio', 'set-volume', 'set-audio-gain', 'set-noise-suppression']
    });
    
    this.categories.set('video', {
      name: 'Video Control',
      description: 'Commands for video settings',
      icon: '📹',
      commands: ['hide-video', 'show-video', 'set-resolution', 'set-framerate', 'set-bitrate']
    });
    
    this.categories.set('effects', {
      name: 'Visual Effects',
      description: 'Commands for video effects and filters',
      icon: '✨',
      commands: ['set-blur', 'set-mirror', 'set-rotation', 'set-virtual-background', 'set-filter']
    });
    
    this.categories.set('screenshare', {
      name: 'Screen Sharing',
      description: 'Commands for screen sharing',
      icon: '🖥️',
      commands: ['start-screenshare', 'stop-screenshare', 'set-screenshare-quality']
    });
    
    this.categories.set('recording', {
      name: 'Recording',
      description: 'Commands for recording streams',
      icon: '⏺️',
      commands: ['start-recording', 'stop-recording', 'pause-recording', 'download-recording']
    });
    
    this.categories.set('devices', {
      name: 'Device Management',
      description: 'Commands for managing input/output devices',
      icon: '🎤',
      commands: ['set-camera', 'set-microphone', 'set-speaker', 'get-devices']
    });
    
    this.categories.set('chat', {
      name: 'Chat',
      description: 'Commands for chat functionality',
      icon: '💬',
      commands: ['send-chat', 'toggle-chat', 'clear-chat', 'set-chat-overlay']
    });
    
    this.categories.set('director', {
      name: 'Director Mode',
      description: 'Commands for director/producer features',
      icon: '🎬',
      commands: ['add-to-scene', 'remove-from-scene', 'spotlight', 'switch-scene', 'mute-guest']
    });
  }
  
  /**
   * Add command to database
   */
  private addCommand(entry: CommandHelpEntry): void {
    this.commandDatabase.set(entry.command, entry);
  }
  
  /**
   * Get help for a specific command
   */
  getCommandHelp(command: string): VdoHelpResponse | null {
    const entry = this.commandDatabase.get(command);
    if (!entry) return null;
    
    return {
      command: entry.command,
      category: entry.category,
      description: entry.description,
      syntax: entry.syntax,
      parameters: entry.parameters,
      examples: entry.examples,
      permissions: entry.permissions,
      relatedCommands: entry.relatedCommands,
      availability: {
        browser: ['chrome', 'firefox', 'edge', 'safari'],
        mobile: true,
        desktop: true
      }
    };
  }
  
  /**
   * Get help for a category
   */
  getCategoryHelp(categoryName: string): VdoHelpResponse | null {
    const category = this.categories.get(categoryName);
    if (!category) return null;
    
    const commands = category.commands
      .map(cmd => this.commandDatabase.get(cmd))
      .filter(Boolean) as CommandHelpEntry[];
    
    return {
      category: categoryName,
      description: category.description,
      examples: commands.slice(0, 3).map(cmd => cmd.syntax || ''),
      relatedCommands: category.commands
    };
  }
  
  /**
   * Get all categories
   */
  getAllCategories(): VdoHelpCategories {
    const categoriesArray = Array.from(this.categories.entries()).map(([key, value]) => ({
      name: value.name,
      description: value.description,
      commands: value.commands,
      icon: value.icon
    }));
    
    return {
      categories: categoriesArray,
      totalCommands: this.commandDatabase.size,
      version: '1.0.0'
    };
  }
  
  /**
   * Search commands
   */
  searchCommands(query: string): CommandHelpEntry[] {
    const results: CommandHelpEntry[] = [];
    const searchTerm = query.toLowerCase();
    
    for (const entry of this.commandDatabase.values()) {
      if (
        entry.command.toLowerCase().includes(searchTerm) ||
        entry.description.toLowerCase().includes(searchTerm) ||
        entry.category.toLowerCase().includes(searchTerm)
      ) {
        results.push(entry);
      }
    }
    
    return results;
  }
  
  /**
   * Get commands by permission
   */
  getCommandsByPermission(permission: string): CommandHelpEntry[] {
    const results: CommandHelpEntry[] = [];
    
    for (const entry of this.commandDatabase.values()) {
      if (entry.permissions?.includes(permission)) {
        results.push(entry);
      }
    }
    
    return results;
  }
  
  /**
   * Get quick reference card
   */
  getQuickReference(): string {
    let reference = '# VDO.Ninja Command Quick Reference\n\n';
    
    for (const [categoryKey, category] of this.categories.entries()) {
      reference += `## ${category.icon} ${category.name}\n`;
      reference += `${category.description}\n\n`;
      
      const commands = category.commands
        .slice(0, 5)
        .map(cmd => {
          const entry = this.commandDatabase.get(cmd);
          return entry ? `- **${entry.command}**: ${entry.description}` : '';
        })
        .filter(Boolean);
      
      reference += commands.join('\n') + '\n\n';
    }
    
    return reference;
  }
}

/**
 * Command help entry interface
 */
interface CommandHelpEntry {
  command: string;
  category: string;
  description: string;
  syntax?: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    default?: any;
  }>;
  examples?: string[];
  permissions?: string[];
  relatedCommands?: string[];
}

/**
 * Category entry interface
 */
interface CategoryEntry {
  name: string;
  description: string;
  icon?: string;
  commands: string[];
}

// Export singleton instance
export const vdoCommandHelp = new VdoCommandHelpSystem();