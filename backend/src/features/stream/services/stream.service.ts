import { unifiedResponse } from 'uni-response';

import { socketEmitters } from '../../../socket/index.js';
import { RoomManager } from '../../../socket/managers/room.manager.js';
import { ProductRepository } from '../../product/repositories/product.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { StreamRepository } from '../repositories/stream.repository.js';
import { streamEventEmitter } from '../events/stream-event-emitter.js';
import {
  AddStreamProductInput,
  CommentInput,
  CreateStreamInput,
  EndStreamInput,
  GoLiveInput,
  StartStreamInput,
  StreamFilters,
  UpdateStreamInput,
  UpdateViewerCountInput,
} from '../types/stream.types.js';
import { vdoNinjaService } from './vdo-ninja.service.js';

export class StreamService {
  constructor(
    private readonly streamRepository: StreamRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createStream(userId: string, input: CreateStreamInput) {
    const stream = await this.streamRepository.createStream(userId, input);
    
    // Get user info for event
    const user = await this.userRepository.findUserById(userId);
    
    // Emit stream created event
    if (user) {
      await streamEventEmitter.emitStreamCreated({
        id: stream.id,
        title: stream.title,
        description: stream.description,
        thumbnailUrl: stream.thumbnailUrl,
        userId: stream.userId,
        user: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
        },
        scheduledFor: stream.scheduledFor?.toISOString(),
        tags: stream.tags,
      });
    }
    
    return unifiedResponse(true, 'Stream created successfully', stream);
  }

  async getStreams(filters: StreamFilters) {
    const streams = await this.streamRepository.findStreams(filters);
    return unifiedResponse(true, 'Streams retrieved successfully', streams);
  }

  async getStreamById(streamId: string) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    return unifiedResponse(true, 'Stream retrieved successfully', stream);
  }

  async updateStream(streamId: string, userId: string, input: UpdateStreamInput) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    if (stream.userId !== userId) {
      return unifiedResponse(false, 'Unauthorized: You can only update your own streams');
    }

    if (stream.isLive) {
      return unifiedResponse(false, 'Cannot update a live stream');
    }

    // Store previous values for event
    const previousValues = {
      title: stream.title,
      description: stream.description,
      thumbnailUrl: stream.thumbnailUrl,
      scheduledFor: stream.scheduledFor?.toISOString(),
      tags: stream.tags,
    };

    const updatedStream = await this.streamRepository.updateStream(streamId, input);
    
    // Get user info for event
    const user = await this.userRepository.findUserById(userId);
    
    // Emit stream updated event
    if (user) {
      await streamEventEmitter.emitStreamEvent({
        type: 'stream:updated',
        streamId,
        timestamp: new Date().toISOString(),
        changes: {
          ...(input.title && { title: input.title }),
          ...(input.description && { description: input.description }),
          ...(input.thumbnailUrl && { thumbnailUrl: input.thumbnailUrl }),
          ...(input.scheduledFor && { scheduledFor: input.scheduledFor.toISOString() }),
          ...(input.tags && { tags: input.tags }),
        },
        previousValues,
        updatedBy: {
          id: user.id,
          username: user.username,
        },
      });
    }
    
    return unifiedResponse(true, 'Stream updated successfully', updatedStream);
  }

  async deleteStream(streamId: string, userId: string, isAdmin: boolean) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    if (stream.userId !== userId && !isAdmin) {
      return unifiedResponse(false, 'Unauthorized: You can only delete your own streams');
    }

    if (stream.isLive) {
      return unifiedResponse(false, 'Cannot delete a live stream');
    }

    await this.streamRepository.deleteStream(streamId);
    return unifiedResponse(true, 'Stream deleted successfully');
  }

  async goLive(streamId: string, userId: string) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    if (stream.userId !== userId) {
      return unifiedResponse(false, 'Unauthorized: You can only start your own streams');
    }

    if (stream.isLive) {
      return unifiedResponse(false, 'Stream is already live');
    }

    const liveStream = await this.streamRepository.goLive(stream.id);

    // Get user info for event
    const user = await this.userRepository.findUserById(userId);

    // Emit stream started event (this will handle all WebSocket notifications)
    if (user) {
      await streamEventEmitter.emitStreamStarted({
        id: liveStream.id,
        title: liveStream.title,
        userId: liveStream.userId,
        user: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
        },
        vdoRoomId: liveStream.vdoRoomId,
        startedAt: liveStream.startedAt?.toISOString() || new Date().toISOString(),
      });
    }


    return unifiedResponse(true, 'Stream is now live', liveStream);
  }

  async startStream(userId: string, input: StartStreamInput) {
    const stream = await this.streamRepository.findStreamById(input.streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    if (stream.userId !== userId) {
      return unifiedResponse(false, 'Unauthorized: You can only start your own streams');
    }

    if (stream.isLive) {
      return unifiedResponse(false, 'Stream is already live');
    }

    const liveStream = await this.streamRepository.goLive(stream.id);


    return unifiedResponse(true, 'Stream started successfully', liveStream);
  }

  async endStream(input: EndStreamInput) {
    const user = await this.userRepository.findUserByStreamKey(input.streamKey);

    if (!user) {
      return unifiedResponse(false, 'Invalid stream key');
    }

    const stream = await this.streamRepository.findStreams({
      userId: user.id,
      isLive: true,
    });

    if (!stream || stream.length === 0) {
      return unifiedResponse(false, 'No live stream found');
    }

    const endedStream = await this.streamRepository.endStream(stream[0].id);

    // Calculate stream duration
    const duration = stream[0].startedAt 
      ? Math.floor((new Date().getTime() - new Date(stream[0].startedAt).getTime()) / 1000)
      : undefined;

    // Emit stream ended event (this will handle all WebSocket notifications)
    await streamEventEmitter.emitStreamEnded(stream[0].id, {
      title: stream[0].title,
      userId: stream[0].userId,
      duration,
      endedAt: endedStream.endedAt?.toISOString() || new Date().toISOString(),
      // TODO: Get actual viewer counts from room manager
      finalViewerCount: 0,
      maxViewerCount: 0,
    }, 'manual');

    // Legacy socket emissions (to be removed once event system is fully integrated)
    try {
      socketEmitters.emitToStream(stream[0].id, 'stream:ended', {
        streamId: stream[0].id,
        endedAt: endedStream.endedAt,
        message: 'Stream has ended',
      });

      // Notify globally that stream is no longer live
      socketEmitters.emitToAll('stream:offline', {
        streamId: stream[0].id,
      });

      // Room cleanup happens automatically when all users leave
      // But we can force cleanup if needed
      const roomManager = RoomManager.getInstance();
      await roomManager.cleanupStreamRoom(stream[0].id);
    } catch (error) {
      console.error('Failed to cleanup WebSocket for stream:', error);
    }

    return unifiedResponse(true, 'Stream ended successfully', endedStream);
  }

  async endStreamById(streamId: string, userId: string) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    if (stream.userId !== userId) {
      return unifiedResponse(false, 'Unauthorized: You can only end your own streams');
    }

    if (!stream.isLive) {
      return unifiedResponse(false, 'Stream is not live');
    }

    const endedStream = await this.streamRepository.endStream(stream.id);

    // Notify all users in the stream room that stream has ended
    try {
      socketEmitters.emitToStream(streamId, 'stream:ended', {
        streamId: streamId,
        endedAt: endedStream.endedAt,
        message: 'Stream has ended',
      });

      // Notify globally that stream is no longer live
      socketEmitters.emitToAll('stream:offline', {
        streamId: streamId,
      });

      // Room cleanup happens automatically when all users leave
      // But we can force cleanup if needed
      const roomManager = RoomManager.getInstance();
      await roomManager.cleanupStreamRoom(streamId);
    } catch (error) {
      console.error('Failed to cleanup WebSocket for stream:', error);
    }

    return unifiedResponse(true, 'Stream ended successfully', endedStream);
  }

  async updateViewerCount(streamId: string, input: UpdateViewerCountInput) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    if (!stream.isLive) {
      return unifiedResponse(false, 'Can only update viewer count for live streams');
    }

    let updatedStream;
    if (input.increment) {
      updatedStream = await this.streamRepository.incrementViewerCount(streamId);
    } else if (input.decrement) {
      updatedStream = await this.streamRepository.decrementViewerCount(streamId);
    } else if (input.count !== undefined) {
      updatedStream = await this.streamRepository.updateViewerCount(streamId, input.count);
    }

    return unifiedResponse(true, 'Viewer count updated', updatedStream);
  }

  async addProductToStream(streamId: string, userId: string, input: AddStreamProductInput) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    if (stream.userId !== userId) {
      return unifiedResponse(false, 'Unauthorized: You can only add products to your own streams');
    }

    const product = await this.productRepository.findProductById(input.productId);
    if (!product) {
      return unifiedResponse(false, 'Product not found');
    }

    const streamProduct = await this.streamRepository.addProductToStream(streamId, input);
    return unifiedResponse(true, 'Product added to stream', streamProduct);
  }

  async removeProductFromStream(streamId: string, userId: string, productId: string) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    if (stream.userId !== userId) {
      return unifiedResponse(
        false,
        'Unauthorized: You can only remove products from your own streams',
      );
    }

    await this.streamRepository.removeProductFromStream(streamId, productId);
    return unifiedResponse(true, 'Product removed from stream');
  }

  async getStreamProducts(streamId: string) {
    const products = await this.streamRepository.getStreamProducts(streamId);
    return unifiedResponse(true, 'Stream products retrieved successfully', products);
  }

  async addComment(userId: string, streamId: string, input: CommentInput) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    if (!stream.isLive) {
      return unifiedResponse(false, 'Can only comment on live streams');
    }

    const comment = await this.streamRepository.createComment(userId, streamId, input);
    return unifiedResponse(true, 'Comment added successfully', comment);
  }

  async getStreamComments(
    streamId: string,
    options?: {
      before?: string;
      after?: string;
      limit?: number;
      cursor?: string;
      includeDeleted?: boolean;
      orderBy?: 'asc' | 'desc';
    },
  ) {
    // Check if stream exists
    const stream = await this.streamRepository.findStreamById(streamId);
    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    // Use the new method if options are provided, otherwise use the basic method
    if (options && Object.keys(options).length > 0) {
      const chatHistory = await this.streamRepository.getStreamChatHistory(streamId, options);
      return unifiedResponse(true, 'Chat history retrieved successfully', chatHistory);
    }

    // Fallback to basic method for backward compatibility
    const comments = await this.streamRepository.getStreamComments(streamId);
    return unifiedResponse(true, 'Comments retrieved successfully', comments);
  }

  async getStreamStats(streamId: string) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    const stats = await this.streamRepository.getStreamStats(streamId);
    return unifiedResponse(true, 'Stream stats retrieved successfully', stats);
  }

  async getStreamViewers(streamId: string) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    const viewers = await this.streamRepository.getStreamViewers(streamId);
    return unifiedResponse(true, 'Stream viewers retrieved successfully', viewers);
  }

  async getStreamingConfig(streamId: string, userId: string) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    // Only stream owner or admin can get streaming config
    if (stream.userId !== userId) {
      const user = await this.userRepository.findUserById(userId);
      if (!user?.isAdmin) {
        return unifiedResponse(false, 'Unauthorized: You can only get config for your own streams');
      }
    }

    // Get the user's stream key
    const user = await this.userRepository.findUserById(stream.userId);
    if (!user || !user.streamKey) {
      return unifiedResponse(false, 'Stream key not found for user');
    }

    // Generate VDO.ninja configuration
    const streamUrls = vdoNinjaService.generateStreamUrls(user.streamKey);
    const obsConfig = vdoNinjaService.generateObsConfig(user.streamKey);

    return unifiedResponse(true, 'Streaming configuration retrieved successfully', {
      streamId,
      streamKey: user.streamKey,
      vdoNinja: {
        ...streamUrls,
        obsConfig,
      },
      instructions: [
        'Use the streamerUrl in OBS Browser Source or open in browser',
        'Share the viewerUrl with your viewers',
        'The stream will automatically connect when you go live',
      ],
    });
  }

  async getViewerUrl(
    streamId: string,
    options?: {
      audioOnly?: boolean;
      lowLatency?: boolean;
      maxQuality?: '360p' | '720p' | '1080p';
    },
  ) {
    const stream = await this.streamRepository.findStreamById(streamId);

    if (!stream) {
      return unifiedResponse(false, 'Stream not found');
    }

    // Get the stream owner's stream key
    const user = await this.userRepository.findUserById(stream.userId);
    if (!user || !user.streamKey) {
      return unifiedResponse(false, 'Stream configuration not found');
    }

    const viewerUrl = vdoNinjaService.generateViewerUrl(user.streamKey, options);

    return unifiedResponse(true, 'Viewer URL generated successfully', {
      streamId,
      streamTitle: stream.title,
      viewerUrl,
      isLive: stream.isLive,
      roomName: `omi-${user.streamKey}`,
    });
  }
}
