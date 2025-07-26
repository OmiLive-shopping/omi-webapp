import { PrismaService } from '../../config/prisma.config.js';
import { SocketWithAuth } from '../../config/socket/socket.config.js';
import { SlowModeManager } from '../managers/rate-limiter.js';
import { RoomManager } from '../managers/room.manager.js';

interface CommandContext {
  socket: SocketWithAuth;
  streamId: string;
  args: string[];
}

export class ChatCommandHandler {
  private commands: Map<string, (ctx: CommandContext) => Promise<void>> = new Map();
  private roomManager = RoomManager.getInstance();
  private slowModeManager = SlowModeManager.getInstance();
  private prisma = PrismaService.getInstance().client;

  constructor() {
    this.registerCommands();
  }

  private registerCommands() {
    // Moderator commands
    this.commands.set('timeout', this.handleTimeout.bind(this));
    this.commands.set('ban', this.handleBan.bind(this));
    this.commands.set('unban', this.handleUnban.bind(this));
    this.commands.set('slowmode', this.handleSlowMode.bind(this));
    this.commands.set('clear', this.handleClear.bind(this));
    this.commands.set('pin', this.handlePin.bind(this));
    this.commands.set('unpin', this.handleUnpin.bind(this));
    this.commands.set('mod', this.handleMod.bind(this));
    this.commands.set('unmod', this.handleUnmod.bind(this));

    // Info commands (anyone can use)
    this.commands.set('help', this.handleHelp.bind(this));
    this.commands.set('uptime', this.handleUptime.bind(this));
    this.commands.set('viewers', this.handleViewers.bind(this));
  }

  async processCommand(
    socket: SocketWithAuth,
    streamId: string,
    message: string,
  ): Promise<boolean> {
    if (!message.startsWith('/')) return false;

    const parts = message.slice(1).split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    if (!command) {
      socket.emit('chat:command:error', { message: `Unknown command: /${commandName}` });
      return true;
    }

    try {
      await command({ socket, streamId, args });
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      socket.emit('chat:command:error', { message: 'Failed to execute command' });
    }

    return true;
  }

  private async handleTimeout(ctx: CommandContext) {
    if (!(await this.isModeratorOrOwner(ctx))) {
      ctx.socket.emit('chat:command:error', { message: 'Moderator permissions required' });
      return;
    }

    const [username, duration, ...reasonParts] = ctx.args;
    if (!username || !duration) {
      ctx.socket.emit('chat:command:usage', {
        message: 'Usage: /timeout <username> <seconds> [reason]',
      });
      return;
    }

    const durationSeconds = parseInt(duration);
    if (isNaN(durationSeconds) || durationSeconds <= 0) {
      ctx.socket.emit('chat:command:error', { message: 'Invalid duration' });
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      ctx.socket.emit('chat:command:error', { message: 'User not found' });
      return;
    }

    // Create moderation record
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);

    await this.prisma.chatModeration.create({
      data: {
        streamId: ctx.streamId,
        userId: user.id,
        moderatorId: ctx.socket.userId!,
        action: 'timeout',
        reason: reasonParts.join(' ') || undefined,
        duration: durationSeconds,
        expiresAt,
      },
    });

    // Broadcast moderation action
    ctx.socket.to(`stream:${ctx.streamId}`).emit('chat:user:moderated', {
      userId: user.id,
      username,
      action: 'timeout',
      moderatorId: ctx.socket.userId,
      reason: reasonParts.join(' ') || undefined,
      duration: durationSeconds,
      timestamp: new Date(),
    });

    ctx.socket.to(`user:${user.id}`).emit('chat:you:moderated', {
      streamId: ctx.streamId,
      action: 'timeout',
      reason: reasonParts.join(' ') || undefined,
      duration: durationSeconds,
      expiresAt,
    });

    ctx.socket.emit('chat:command:success', {
      message: `${username} has been timed out for ${durationSeconds} seconds`,
    });
  }

  private async handleBan(ctx: CommandContext) {
    if (!(await this.isModeratorOrOwner(ctx))) {
      ctx.socket.emit('chat:command:error', { message: 'Moderator permissions required' });
      return;
    }

    const [username, ...reasonParts] = ctx.args;
    if (!username) {
      ctx.socket.emit('chat:command:usage', { message: 'Usage: /ban <username> [reason]' });
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      ctx.socket.emit('chat:command:error', { message: 'User not found' });
      return;
    }

    // Create moderation record
    await this.prisma.chatModeration.create({
      data: {
        streamId: ctx.streamId,
        userId: user.id,
        moderatorId: ctx.socket.userId!,
        action: 'ban',
        reason: reasonParts.join(' ') || undefined,
        expiresAt: null, // Permanent ban
      },
    });

    // Broadcast moderation action
    ctx.socket.to(`stream:${ctx.streamId}`).emit('chat:user:moderated', {
      userId: user.id,
      username,
      action: 'ban',
      moderatorId: ctx.socket.userId,
      reason: reasonParts.join(' ') || undefined,
      timestamp: new Date(),
    });

    ctx.socket.to(`user:${user.id}`).emit('chat:you:moderated', {
      streamId: ctx.streamId,
      action: 'ban',
      reason: reasonParts.join(' ') || undefined,
    });

    ctx.socket.emit('chat:command:success', { message: `${username} has been banned` });
  }

  private async handleUnban(ctx: CommandContext) {
    if (!(await this.isModeratorOrOwner(ctx))) {
      ctx.socket.emit('chat:command:error', { message: 'Moderator permissions required' });
      return;
    }

    const [username] = ctx.args;
    if (!username) {
      ctx.socket.emit('chat:command:usage', { message: 'Usage: /unban <username>' });
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      ctx.socket.emit('chat:command:error', { message: 'User not found' });
      return;
    }

    // Create unban record
    await this.prisma.chatModeration.create({
      data: {
        streamId: ctx.streamId,
        userId: user.id,
        moderatorId: ctx.socket.userId!,
        action: 'unban',
      },
    });

    // Broadcast moderation action
    ctx.socket.to(`stream:${ctx.streamId}`).emit('chat:user:moderated', {
      userId: user.id,
      username,
      action: 'unban',
      moderatorId: ctx.socket.userId,
      timestamp: new Date(),
    });

    ctx.socket.emit('chat:command:success', { message: `${username} has been unbanned` });
  }

  private async handleSlowMode(ctx: CommandContext) {
    if (!(await this.isModeratorOrOwner(ctx))) {
      ctx.socket.emit('chat:command:error', { message: 'Moderator permissions required' });
      return;
    }

    const [delayStr] = ctx.args;
    const delay = delayStr ? parseInt(delayStr) : 30;

    if (delay === 0) {
      // Disable slow mode
      this.slowModeManager.disableSlowMode(ctx.streamId);

      await this.prisma.stream.update({
        where: { id: ctx.streamId },
        data: { slowModeDelay: 0 },
      });

      ctx.socket.to(`stream:${ctx.streamId}`).emit('chat:slowmode:disabled');
      ctx.socket.emit('chat:command:success', { message: 'Slow mode disabled' });
    } else {
      if (isNaN(delay) || delay < 0 || delay > 300) {
        ctx.socket.emit('chat:command:error', { message: 'Delay must be between 0-300 seconds' });
        return;
      }

      // Enable slow mode
      this.slowModeManager.enableSlowMode(ctx.streamId, delay);

      await this.prisma.stream.update({
        where: { id: ctx.streamId },
        data: { slowModeDelay: delay },
      });

      ctx.socket.to(`stream:${ctx.streamId}`).emit('chat:slowmode:enabled', { delay });
      ctx.socket.emit('chat:command:success', { message: `Slow mode enabled: ${delay} seconds` });
    }
  }

  private async handleClear(ctx: CommandContext) {
    if (!(await this.isModeratorOrOwner(ctx))) {
      ctx.socket.emit('chat:command:error', { message: 'Moderator permissions required' });
      return;
    }

    // Mark all messages as deleted
    await this.prisma.comment.updateMany({
      where: {
        streamId: ctx.streamId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    ctx.socket.to(`stream:${ctx.streamId}`).emit('chat:cleared', {
      clearedBy: ctx.socket.userId,
    });
    ctx.socket.emit('chat:command:success', { message: 'Chat cleared' });
  }

  private async handlePin(ctx: CommandContext) {
    if (!(await this.isModeratorOrOwner(ctx))) {
      ctx.socket.emit('chat:command:error', { message: 'Moderator permissions required' });
      return;
    }

    const [messageId] = ctx.args;
    if (!messageId) {
      ctx.socket.emit('chat:command:usage', { message: 'Usage: /pin <messageId>' });
      return;
    }

    // Check if message exists
    const message = await this.prisma.comment.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!message || message.streamId !== ctx.streamId) {
      ctx.socket.emit('chat:command:error', { message: 'Message not found' });
      return;
    }

    // Unpin any existing pinned message
    await this.prisma.comment.updateMany({
      where: {
        streamId: ctx.streamId,
        isPinned: true,
      },
      data: { isPinned: false },
    });

    // Pin the new message
    await this.prisma.comment.update({
      where: { id: messageId },
      data: { isPinned: true },
    });

    ctx.socket.to(`stream:${ctx.streamId}`).emit('chat:message:pinned', {
      message: {
        id: message.id,
        content: message.content,
        userId: message.user.id,
        username: message.user.username,
        avatarUrl: message.user.avatarUrl,
        timestamp: message.createdAt,
        isPinned: true,
      },
      pinnedBy: ctx.socket.userId,
    });

    ctx.socket.emit('chat:command:success', { message: 'Message pinned' });
  }

  private async handleUnpin(ctx: CommandContext) {
    if (!(await this.isModeratorOrOwner(ctx))) {
      ctx.socket.emit('chat:command:error', { message: 'Moderator permissions required' });
      return;
    }

    // Find pinned message
    const pinnedMessage = await this.prisma.comment.findFirst({
      where: {
        streamId: ctx.streamId,
        isPinned: true,
      },
    });

    if (!pinnedMessage) {
      ctx.socket.emit('chat:command:error', { message: 'No pinned message' });
      return;
    }

    // Unpin the message
    await this.prisma.comment.update({
      where: { id: pinnedMessage.id },
      data: { isPinned: false },
    });

    ctx.socket.to(`stream:${ctx.streamId}`).emit('chat:message:unpinned', {
      messageId: pinnedMessage.id,
      unpinnedBy: ctx.socket.userId,
    });

    ctx.socket.emit('chat:command:success', { message: 'Message unpinned' });
  }

  private async handleMod(ctx: CommandContext) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: ctx.streamId },
      select: { userId: true },
    });

    if (stream?.userId !== ctx.socket.userId && ctx.socket.role !== 'admin') {
      ctx.socket.emit('chat:command:error', { message: 'Only stream owner can add moderators' });
      return;
    }

    const [username] = ctx.args;
    if (!username) {
      ctx.socket.emit('chat:command:usage', { message: 'Usage: /mod <username>' });
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      ctx.socket.emit('chat:command:error', { message: 'User not found' });
      return;
    }

    // Add to database
    await this.prisma.streamModerator.create({
      data: {
        streamId: ctx.streamId,
        userId: user.id,
        addedBy: ctx.socket.userId!,
      },
    });

    // Add to room manager
    this.roomManager.addModerator(ctx.streamId, user.id);

    ctx.socket.to(`stream:${ctx.streamId}`).emit('chat:moderator:added', {
      userId: user.id,
      username,
      addedBy: ctx.socket.userId,
    });
    ctx.socket.emit('chat:command:success', { message: `${username} is now a moderator` });
  }

  private async handleUnmod(ctx: CommandContext) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: ctx.streamId },
      select: { userId: true },
    });

    if (stream?.userId !== ctx.socket.userId && ctx.socket.role !== 'admin') {
      ctx.socket.emit('chat:command:error', { message: 'Only stream owner can remove moderators' });
      return;
    }

    const [username] = ctx.args;
    if (!username) {
      ctx.socket.emit('chat:command:usage', { message: 'Usage: /unmod <username>' });
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      ctx.socket.emit('chat:command:error', { message: 'User not found' });
      return;
    }

    // Remove from database
    await this.prisma.streamModerator.deleteMany({
      where: {
        streamId: ctx.streamId,
        userId: user.id,
      },
    });

    // Remove from room manager
    this.roomManager.removeModerator(ctx.streamId, user.id);

    ctx.socket.to(`stream:${ctx.streamId}`).emit('chat:moderator:removed', {
      userId: user.id,
      username,
      removedBy: ctx.socket.userId,
    });
    ctx.socket.emit('chat:command:success', { message: `${username} is no longer a moderator` });
  }

  private async handleHelp(ctx: CommandContext) {
    const isModerator = await this.isModeratorOrOwner(ctx);

    const commands = [
      '**Available Commands:**',
      '/help - Show this help message',
      '/uptime - Show stream uptime',
      '/viewers - Show current viewer count',
    ];

    if (isModerator) {
      commands.push(
        '',
        '**Moderator Commands:**',
        '/timeout <user> <seconds> [reason] - Timeout a user',
        '/ban <user> [reason] - Ban a user',
        '/unban <user> - Unban a user',
        '/slowmode [seconds] - Toggle slow mode (0 to disable)',
        '/clear - Clear all chat messages',
        '/pin <messageId> - Pin a message',
        '/unpin - Unpin the current pinned message',
        '/mod <user> - Make user a moderator',
        '/unmod <user> - Remove moderator status',
      );
    }

    ctx.socket.emit('chat:system:message', {
      content: commands.join('\n'),
      type: 'help',
    });
  }

  private async handleUptime(ctx: CommandContext) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: ctx.streamId },
      select: { startedAt: true, isLive: true },
    });

    if (!stream || !stream.isLive || !stream.startedAt) {
      ctx.socket.emit('chat:system:message', {
        content: 'Stream is not live',
        type: 'info',
      });
      return;
    }

    const uptime = Date.now() - stream.startedAt.getTime();
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    ctx.socket.emit('chat:system:message', {
      content: `Stream uptime: ${hours}h ${minutes}m ${seconds}s`,
      type: 'info',
    });
  }

  private async handleViewers(ctx: CommandContext) {
    const viewerCount = this.roomManager.getViewerCount(ctx.streamId);

    ctx.socket.emit('chat:system:message', {
      content: `Current viewers: ${viewerCount}`,
      type: 'info',
    });
  }

  private async isModeratorOrOwner(ctx: CommandContext): Promise<boolean> {
    if (!ctx.socket.userId) return false;

    const stream = await this.prisma.stream.findUnique({
      where: { id: ctx.streamId },
      select: { userId: true },
    });

    return (
      stream?.userId === ctx.socket.userId ||
      this.roomManager.isModerator(ctx.streamId, ctx.socket.userId) ||
      ctx.socket.role === 'admin'
    );
  }
}
