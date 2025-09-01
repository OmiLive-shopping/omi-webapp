export interface Stream {
  id: string;
  title: string;
  description?: string;
  vdoRoomId: string;
  streamerId: string;
  streamer?: {
    id: string;
    username: string;
    email: string;
  };
  isLive: boolean;
  startedAt?: string;
  endedAt?: string;
  viewerCount: number;
  category?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StreamUpdate {
  streamId: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  isLive?: boolean;
  viewerCount?: number;
}

export interface StreamViewerUpdate {
  viewerCount: number;
  viewer?: {
    id: string;
    username: string;
  };
}