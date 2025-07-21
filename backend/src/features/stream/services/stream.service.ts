import { unifiedResponse } from 'uni-response';

import { ProductRepository } from '../../product/repositories/product.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import { StreamRepository } from '../repositories/stream.repository';
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
} from '../types/stream.types';

export class StreamService {
  constructor(
    private readonly streamRepository: StreamRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createStream(userId: string, input: CreateStreamInput) {
    const stream = await this.streamRepository.createStream(userId, input);
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

    const updatedStream = await this.streamRepository.updateStream(streamId, input);
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

  async getStreamComments(streamId: string) {
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
}
