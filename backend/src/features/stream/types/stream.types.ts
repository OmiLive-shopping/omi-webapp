export interface CreateStreamInput {
  title: string;
  description?: string;
  scheduled: string | Date;
  vdoRoomId: string;
}

export interface UpdateStreamInput {
  title?: string;
  description?: string;
  scheduled?: string | Date;
  vdoRoomId?: string;
}

export interface StreamFilters {
  isLive?: boolean;
  userId?: string;
  upcoming?: boolean;
  past?: boolean;
  search?: string;
}

export interface GoLiveInput {
  streamKey: string;
}

export interface EndStreamInput {
  streamKey: string;
}

export interface UpdateViewerCountInput {
  increment?: boolean;
  decrement?: boolean;
  count?: number;
}

export interface AddStreamProductInput {
  productId: string;
  order?: number;
}

export interface CommentInput {
  content: string;
}

export interface StartStreamInput {
  streamId: string;
  streamKey?: string;
}
