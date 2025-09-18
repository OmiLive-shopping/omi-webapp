import { Request, Response } from 'express';

import { StreamService } from '../services/stream.service.js';
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

export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  createStream = async (req: Request, res: Response) => {
    const input: CreateStreamInput = req.body;
    const userId = (req as any).user.id;

    const result = await this.streamService.createStream(userId, input);
    res.status(result.success ? 201 : 400).json(result);
  };

  getStreams = async (req: Request, res: Response) => {
    const filters: StreamFilters = {
      ...req.query,
      // Convert string booleans to actual booleans
      isLive: req.query.isLive === 'true' ? true : req.query.isLive === 'false' ? false : undefined,
      upcoming:
        req.query.upcoming === 'true' ? true : req.query.upcoming === 'false' ? false : undefined,
      past: req.query.past === 'true' ? true : req.query.past === 'false' ? false : undefined,
    } as StreamFilters;
    const result = await this.streamService.getStreams(filters);
    res.status(200).json(result);
  };

  getStreamById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await this.streamService.getStreamById(id);
    res.status(result.success ? 200 : 404).json(result);
  };

  updateStream = async (req: Request, res: Response) => {
    const { id } = req.params;
    const input: UpdateStreamInput = req.body;
    const userId = (req as any).user.id;

    const result = await this.streamService.updateStream(id, userId, input);
    res
      .status(result.success ? 200 : result.message.includes('Unauthorized') ? 403 : 404)
      .json(result);
  };

  deleteStream = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const isAdmin = (req as any).user.isAdmin || false;

    const result = await this.streamService.deleteStream(id, userId, isAdmin);
    res
      .status(result.success ? 200 : result.message.includes('Unauthorized') ? 403 : 404)
      .json(result);
  };

  goLive = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const result = await this.streamService.goLive(id, userId);
    res.status(result.success ? 200 : 404).json(result);
  };

  startStream = async (req: Request, res: Response) => {
    const input: StartStreamInput = req.body;
    const userId = (req as any).user.id;

    const result = await this.streamService.startStream(userId, input);
    res.status(result.success ? 200 : 404).json(result);
  };

  endStream = async (req: Request, res: Response) => {
    const input: EndStreamInput = req.body;

    const result = await this.streamService.endStream(input);
    res.status(result.success ? 200 : 404).json(result);
  };

  endStreamById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const result = await this.streamService.endStreamById(id, userId);
    res.status(result.success ? 200 : 404).json(result);
  };

  updateViewerCount = async (req: Request, res: Response) => {
    const { id } = req.params;
    const input: UpdateViewerCountInput = req.body;

    const result = await this.streamService.updateViewerCount(id, input);
    res.status(result.success ? 200 : 404).json(result);
  };

  addProductToStream = async (req: Request, res: Response) => {
    const { id } = req.params;
    const input: AddStreamProductInput = req.body;
    const userId = (req as any).user.id;

    const result = await this.streamService.addProductToStream(id, userId, input);
    res
      .status(result.success ? 200 : result.message.includes('Unauthorized') ? 403 : 404)
      .json(result);
  };

  removeProductFromStream = async (req: Request, res: Response) => {
    const { id, productId } = req.params;
    const userId = (req as any).user.id;

    const result = await this.streamService.removeProductFromStream(id, userId, productId);
    res
      .status(result.success ? 200 : result.message.includes('Unauthorized') ? 403 : 404)
      .json(result);
  };

  getStreamProducts = async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await this.streamService.getStreamProducts(id);
    res.status(200).json(result);
  };

  addComment = async (req: Request, res: Response) => {
    const { id } = req.params;
    const input: CommentInput = req.body;
    const userId = (req as any).user.id;

    const result = await this.streamService.addComment(userId, id, input);
    res.status(result.success ? 201 : 404).json(result);
  };

  getStreamComments = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { before, after, limit, cursor, includeDeleted, orderBy } = req.query;

    const options = {
      before: before as string,
      after: after as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string,
      includeDeleted: includeDeleted === 'true',
      orderBy: orderBy as 'asc' | 'desc',
    };

    // Remove undefined values
    Object.keys(options).forEach(
      key =>
        options[key as keyof typeof options] === undefined &&
        delete options[key as keyof typeof options],
    );

    const result = await this.streamService.getStreamComments(id, options);
    res.status(result.success ? 200 : 404).json(result);
  };

  getStreamStats = async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await this.streamService.getStreamStats(id);
    res.status(result.success ? 200 : 404).json(result);
  };

  getStreamViewers = async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await this.streamService.getStreamViewers(id);
    res.status(result.success ? 200 : 404).json(result);
  };

  getStreamingConfig = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const result = await this.streamService.getStreamingConfig(id, userId);
    res
      .status(result.success ? 200 : result.message.includes('Unauthorized') ? 403 : 404)
      .json(result);
  };

  getViewerUrl = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { audioOnly, lowLatency, maxQuality } = req.query;

    const options = {
      audioOnly: audioOnly === 'true',
      lowLatency: lowLatency === 'true',
      maxQuality: maxQuality as '360p' | '720p' | '1080p' | undefined,
    };

    const result = await this.streamService.getViewerUrl(id, options);
    res.status(result.success ? 200 : 404).json(result);
  };
}
