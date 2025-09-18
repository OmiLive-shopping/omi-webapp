import { z } from 'zod';

/**
 * Stream command types and utilities for chat integration
 */

export type StreamCommandType =
  | 'start'
  | 'stop'
  | 'pause'
  | 'resume'
  | 'feature'
  | 'unfeature'
  | 'quality'
  | 'record'
  | 'snapshot'
  | 'mute'
  | 'unmute'
  | 'volume'
  | 'fullscreen'
  | 'pip'
  | 'stats'
  | 'help';

/**
 * Stream command definition interface
 */
export interface StreamCommand {
  type: StreamCommandType;
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  requiresAuth: boolean;
  requiredRole: 'viewer' | 'subscriber' | 'moderator' | 'streamer' | 'admin';
  parameters?: {
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description: string;
  }[];
}

/**
 * Available stream commands
 */
export const STREAM_COMMANDS: Record<StreamCommandType, StreamCommand> = {
  start: {
    type: 'start',
    name: 'start',
    aliases: ['begin', 'go'],
    description: 'Start the stream',
    usage: '/start',
    requiresAuth: true,
    requiredRole: 'streamer',
  },

  stop: {
    type: 'stop',
    name: 'stop',
    aliases: ['end', 'finish'],
    description: 'Stop the stream',
    usage: '/stop',
    requiresAuth: true,
    requiredRole: 'streamer',
  },

  pause: {
    type: 'pause',
    name: 'pause',
    aliases: ['hold'],
    description: 'Pause the stream',
    usage: '/pause',
    requiresAuth: true,
    requiredRole: 'streamer',
  },

  resume: {
    type: 'resume',
    name: 'resume',
    aliases: ['continue', 'unpause'],
    description: 'Resume the stream',
    usage: '/resume',
    requiresAuth: true,
    requiredRole: 'streamer',
  },

  feature: {
    type: 'feature',
    name: 'feature',
    aliases: ['showcase', 'highlight'],
    description: 'Feature a product in the stream',
    usage: '/feature <product_id>',
    requiresAuth: true,
    requiredRole: 'moderator',
    parameters: [
      {
        name: 'product_id',
        type: 'string',
        required: true,
        description: 'ID of the product to feature',
      },
    ],
  },

  unfeature: {
    type: 'unfeature',
    name: 'unfeature',
    aliases: ['unshowcase', 'unhighlight'],
    description: 'Remove featured product from stream',
    usage: '/unfeature',
    requiresAuth: true,
    requiredRole: 'moderator',
  },

  quality: {
    type: 'quality',
    name: 'quality',
    aliases: ['q', 'res'],
    description: 'Change stream quality',
    usage: '/quality <quality>',
    requiresAuth: true,
    requiredRole: 'streamer',
    parameters: [
      {
        name: 'quality',
        type: 'string',
        required: false,
        description: 'Quality setting (auto, 1080p, 720p, 480p, 360p)',
      },
    ],
  },

  record: {
    type: 'record',
    name: 'record',
    aliases: ['rec'],
    description: 'Start/stop recording',
    usage: '/record [start|stop]',
    requiresAuth: true,
    requiredRole: 'streamer',
    parameters: [
      {
        name: 'action',
        type: 'string',
        required: false,
        description: 'start or stop recording (toggles if not specified)',
      },
    ],
  },

  snapshot: {
    type: 'snapshot',
    name: 'snapshot',
    aliases: ['screenshot', 'capture'],
    description: 'Take a snapshot of the stream',
    usage: '/snapshot',
    requiresAuth: true,
    requiredRole: 'moderator',
  },

  mute: {
    type: 'mute',
    name: 'mute',
    aliases: [],
    description: 'Mute the stream audio',
    usage: '/mute',
    requiresAuth: true,
    requiredRole: 'streamer',
  },

  unmute: {
    type: 'unmute',
    name: 'unmute',
    aliases: [],
    description: 'Unmute the stream audio',
    usage: '/unmute',
    requiresAuth: true,
    requiredRole: 'streamer',
  },

  volume: {
    type: 'volume',
    name: 'volume',
    aliases: ['vol'],
    description: 'Set stream volume',
    usage: '/volume <level>',
    requiresAuth: true,
    requiredRole: 'streamer',
    parameters: [
      {
        name: 'level',
        type: 'number',
        required: true,
        description: 'Volume level (0-100)',
      },
    ],
  },

  fullscreen: {
    type: 'fullscreen',
    name: 'fullscreen',
    aliases: ['fs', 'full'],
    description: 'Toggle fullscreen mode',
    usage: '/fullscreen',
    requiresAuth: false,
    requiredRole: 'viewer',
  },

  pip: {
    type: 'pip',
    name: 'pip',
    aliases: ['picture-in-picture', 'mini'],
    description: 'Toggle picture-in-picture mode',
    usage: '/pip',
    requiresAuth: false,
    requiredRole: 'viewer',
  },

  stats: {
    type: 'stats',
    name: 'stats',
    aliases: ['info', 'status'],
    description: 'Show stream statistics',
    usage: '/stats',
    requiresAuth: false,
    requiredRole: 'viewer',
  },

  help: {
    type: 'help',
    name: 'help',
    aliases: ['commands', '?'],
    description: 'Show available commands',
    usage: '/help [command]',
    requiresAuth: false,
    requiredRole: 'viewer',
    parameters: [
      {
        name: 'command',
        type: 'string',
        required: false,
        description: 'Specific command to get help for',
      },
    ],
  },
};

/**
 * Stream command parser and validator
 */
export class StreamCommandParser {
  private static readonly COMMAND_PREFIX = '/';

  /**
   * Check if a message is a stream command
   */
  static isCommand(message: string): boolean {
    return message.trim().startsWith(this.COMMAND_PREFIX);
  }

  /**
   * Parse a command message into components
   */
  static parseCommand(message: string): {
    command: string;
    args: string[];
    raw: string;
  } | null {
    if (!this.isCommand(message)) {
      return null;
    }

    const trimmed = message.trim().substring(1); // Remove prefix
    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    return {
      command,
      args,
      raw: trimmed,
    };
  }

  /**
   * Find command by name or alias
   */
  static findCommand(commandName: string): StreamCommand | null {
    const name = commandName.toLowerCase();

    // Direct name match
    for (const cmd of Object.values(STREAM_COMMANDS)) {
      if (cmd.name === name) {
        return cmd;
      }
    }

    // Alias match
    for (const cmd of Object.values(STREAM_COMMANDS)) {
      if (cmd.aliases.includes(name)) {
        return cmd;
      }
    }

    return null;
  }

  /**
   * Validate command permissions
   */
  static canExecuteCommand(
    command: StreamCommand,
    userRole: string,
    isAuthenticated: boolean,
  ): { canExecute: boolean; reason?: string } {
    if (command.requiresAuth && !isAuthenticated) {
      return {
        canExecute: false,
        reason: 'Authentication required',
      };
    }

    const roleHierarchy = {
      viewer: 0,
      subscriber: 1,
      moderator: 2,
      streamer: 3,
      admin: 4,
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? 0;
    const requiredLevel = roleHierarchy[command.requiredRole];

    if (userLevel < requiredLevel) {
      return {
        canExecute: false,
        reason: `${command.requiredRole} role or higher required`,
      };
    }

    return { canExecute: true };
  }

  /**
   * Validate command parameters
   */
  static validateParameters(
    command: StreamCommand,
    args: string[],
  ): { isValid: boolean; errors?: string[] } {
    if (!command.parameters) {
      return { isValid: true };
    }

    const errors: string[] = [];
    const requiredParams = command.parameters.filter(p => p.required);

    // Check required parameters
    if (args.length < requiredParams.length) {
      errors.push(
        `Missing required parameters. Expected: ${requiredParams.map(p => p.name).join(', ')}`,
      );
    }

    // Validate parameter types
    for (let i = 0; i < command.parameters.length && i < args.length; i++) {
      const param = command.parameters[i];
      const value = args[i];

      switch (param.type) {
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`Parameter '${param.name}' must be a number`);
          }
          break;
        case 'boolean':
          if (
            !['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase())
          ) {
            errors.push(`Parameter '${param.name}' must be a boolean (true/false)`);
          }
          break;
        // string parameters are always valid
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Generate help text for a command
   */
  static getCommandHelp(command: StreamCommand): string {
    let help = `**${command.usage}**\n${command.description}`;

    if (command.aliases.length > 0) {
      help += `\nAliases: ${command.aliases.map(a => `/${a}`).join(', ')}`;
    }

    if (command.requiresAuth) {
      help += `\nRequires: ${command.requiredRole} role or higher`;
    }

    if (command.parameters) {
      help += '\nParameters:';
      for (const param of command.parameters) {
        const required = param.required ? ' (required)' : ' (optional)';
        help += `\n  • ${param.name}: ${param.description}${required}`;
      }
    }

    return help;
  }

  /**
   * Generate help text for all commands available to a user
   */
  static getAvailableCommands(userRole: string, isAuthenticated: boolean): string {
    const availableCommands = Object.values(STREAM_COMMANDS)
      .filter(cmd => this.canExecuteCommand(cmd, userRole, isAuthenticated).canExecute)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (availableCommands.length === 0) {
      return 'No commands available.';
    }

    let help = 'Available commands:\n';
    for (const cmd of availableCommands) {
      help += `• **${cmd.usage}** - ${cmd.description}\n`;
    }

    help += '\nUse `/help <command>` for detailed information about a specific command.';

    return help;
  }

  /**
   * Convert parameter value to correct type
   */
  static convertParameterValue(value: string, type: 'string' | 'number' | 'boolean'): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
      default:
        return value;
    }
  }
}

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Stream command execution context
 */
export interface CommandContext {
  streamId: string;
  userId: string;
  username: string;
  userRole: string;
  isAuthenticated: boolean;
  socketId: string;
}

/**
 * Validation schema for stream commands
 */
export const streamCommandSchema = z.object({
  streamId: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  context: z.object({
    userId: z.string().optional(),
    username: z.string(),
    userRole: z.string(),
    isAuthenticated: z.boolean(),
    socketId: z.string(),
  }),
});

export type ValidatedStreamCommand = z.infer<typeof streamCommandSchema>;
