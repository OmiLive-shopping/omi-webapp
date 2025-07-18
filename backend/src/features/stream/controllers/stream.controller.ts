import { Request, Response } from 'express';

import { StreamService } from '../services/stream.service';
import {
  AddStreamProductInput,
  CommentInput,
  CreateStreamInput,
  EndStreamInput,
  GoLiveInput,
  StreamFilters,
  UpdateStreamInput,
  UpdateViewerCountInput,
} from '../types/stream.types';

export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  createStream = async (req: Request, res: Response) => {
    const input: CreateStreamInput = req.body;
    const userId = (req as any).user.id;

    const result = await this.streamService.createStream(userId, input);
    res.status(result.success ? 201 : 400).json(result);
  };

  getStreams = async (req: Request, res: Response) => {
    const filters: StreamFilters = req.query as any;
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
    const input: GoLiveInput = req.body;

    const result = await this.streamService.goLive(input);
    res.status(result.success ? 200 : 404).json(result);
  };

  endStream = async (req: Request, res: Response) => {
    const input: EndStreamInput = req.body;

    const result = await this.streamService.endStream(input);
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

    const result = await this.streamService.getStreamComments(id);
    res.status(200).json(result);
  };
}
