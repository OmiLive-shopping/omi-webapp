import { PrismaClient, Prisma } from '@prisma/client';
import { injectable } from 'tsyringe';
import prisma from '@/config/prisma';

@injectable()
export class AnalyticsRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  // StreamAnalytics methods
  async createStreamAnalytics(data: Prisma.StreamAnalyticsCreateInput) {
    return this.prisma.streamAnalytics.create({ data });
  }

  async upsertStreamAnalytics(
    streamId: string,
    intervalType: string,
    intervalStart: Date,
    data: Prisma.StreamAnalyticsUpdateInput
  ) {
    return this.prisma.streamAnalytics.upsert({
      where: {
        streamId_intervalType_intervalStart: {
          streamId,
          intervalType,
          intervalStart
        }
      },
      update: data,
      create: {
        ...data,
        stream: { connect: { id: streamId } },
        intervalType,
        intervalStart
      } as Prisma.StreamAnalyticsCreateInput
    });
  }

  async getStreamAnalytics(
    streamId: string,
    intervalType?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: Prisma.StreamAnalyticsWhereInput = {
      streamId,
      ...(intervalType && { intervalType }),
      ...(startDate && endDate && {
        intervalStart: {
          gte: startDate,
          lte: endDate
        }
      })
    };

    return this.prisma.streamAnalytics.findMany({
      where,
      orderBy: { intervalStart: 'desc' }
    });
  }

  async aggregateStreamAnalytics(
    streamId: string,
    startDate: Date,
    endDate: Date
  ) {
    const result = await this.prisma.streamAnalytics.aggregate({
      where: {
        streamId,
        intervalStart: {
          gte: startDate,
          lte: endDate
        }
      },
      _avg: {
        averageViewers: true,
        averageFps: true,
        averageBitrate: true,
        averageLatency: true,
        averagePacketLoss: true,
        connectionScore: true
      },
      _max: {
        peakViewers: true,
        maxFps: true,
        maxBitrate: true,
        maxLatency: true,
        maxPacketLoss: true
      },
      _min: {
        minFps: true,
        minBitrate: true
      },
      _sum: {
        totalViewTime: true,
        uniqueViewers: true,
        reconnectCount: true
      }
    });

    return result;
  }

  // StreamRealtimeStats methods
  async createRealtimeStats(data: Prisma.StreamRealtimeStatsCreateInput) {
    return this.prisma.streamRealtimeStats.create({ data });
  }

  async getLatestRealtimeStats(streamId: string) {
    return this.prisma.streamRealtimeStats.findFirst({
      where: { streamId },
      orderBy: { timestamp: 'desc' }
    });
  }

  async getRealtimeStatsHistory(
    streamId: string,
    limit: number = 100,
    since?: Date
  ) {
    return this.prisma.streamRealtimeStats.findMany({
      where: {
        streamId,
        ...(since && { timestamp: { gte: since } })
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  async bulkCreateRealtimeStats(
    data: Prisma.StreamRealtimeStatsCreateManyInput[]
  ) {
    return this.prisma.streamRealtimeStats.createMany({
      data,
      skipDuplicates: true
    });
  }

  // StreamQualityEvent methods
  async createQualityEvent(data: Prisma.StreamQualityEventCreateInput) {
    return this.prisma.streamQualityEvent.create({ data });
  }

  async getQualityEvents(
    streamId: string,
    options?: {
      eventType?: string;
      severity?: string;
      resolved?: boolean;
      since?: Date;
      limit?: number;
    }
  ) {
    const { eventType, severity, resolved, since, limit = 100 } = options || {};

    return this.prisma.streamQualityEvent.findMany({
      where: {
        streamId,
        ...(eventType && { eventType }),
        ...(severity && { severity }),
        ...(resolved !== undefined && { resolved }),
        ...(since && { timestamp: { gte: since } })
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  async resolveQualityEvent(eventId: string) {
    const event = await this.prisma.streamQualityEvent.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new Error('Quality event not found');
    }

    const resolutionTime = event.timestamp
      ? Math.floor((Date.now() - event.timestamp.getTime()) / 1000)
      : 0;

    return this.prisma.streamQualityEvent.update({
      where: { id: eventId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolutionTime
      }
    });
  }

  // ViewerAnalytics methods
  async createViewerAnalytics(data: Prisma.ViewerAnalyticsCreateInput) {
    return this.prisma.viewerAnalytics.create({ data });
  }

  async updateViewerAnalytics(
    streamId: string,
    sessionId: string,
    data: Prisma.ViewerAnalyticsUpdateInput
  ) {
    return this.prisma.viewerAnalytics.update({
      where: {
        streamId_sessionId: {
          streamId,
          sessionId
        }
      },
      data
    });
  }

  async getViewerAnalytics(
    streamId: string,
    options?: {
      userId?: string;
      sessionId?: string;
      since?: Date;
      limit?: number;
    }
  ) {
    const { userId, sessionId, since, limit = 100 } = options || {};

    return this.prisma.viewerAnalytics.findMany({
      where: {
        streamId,
        ...(userId && { userId }),
        ...(sessionId && { sessionId }),
        ...(since && { joinedAt: { gte: since } })
      },
      orderBy: { joinedAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });
  }

  async getViewerEngagementStats(streamId: string) {
    const result = await this.prisma.viewerAnalytics.aggregate({
      where: { streamId },
      _avg: {
        totalWatchTime: true,
        chatMessageCount: true,
        reactionCount: true,
        bufferingTime: true,
        reconnectCount: true
      },
      _sum: {
        totalWatchTime: true,
        chatMessageCount: true,
        reactionCount: true
      },
      _count: {
        _all: true
      }
    });

    return result;
  }

  // Cleanup methods
  async cleanupOldRealtimeStats(olderThan: Date) {
    return this.prisma.streamRealtimeStats.deleteMany({
      where: {
        timestamp: {
          lt: olderThan
        }
      }
    });
  }

  async cleanupOldAnalytics(intervalType: string, olderThan: Date) {
    return this.prisma.streamAnalytics.deleteMany({
      where: {
        intervalType,
        intervalStart: {
          lt: olderThan
        }
      }
    });
  }

  async cleanupResolvedQualityEvents(olderThan: Date) {
    return this.prisma.streamQualityEvent.deleteMany({
      where: {
        resolved: true,
        resolvedAt: {
          lt: olderThan
        }
      }
    });
  }

  // Aggregation queries for reporting
  async getStreamPerformanceReport(streamId: string) {
    const [analytics, qualityEvents, viewerStats] = await Promise.all([
      this.aggregateStreamAnalytics(
        streamId,
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        new Date()
      ),
      this.prisma.streamQualityEvent.groupBy({
        by: ['severity'],
        where: {
          streamId,
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        _count: {
          _all: true
        }
      }),
      this.getViewerEngagementStats(streamId)
    ]);

    return {
      analytics,
      qualityEvents,
      viewerStats
    };
  }

  async getTopStreams(
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ) {
    const topStreams = await this.prisma.streamAnalytics.groupBy({
      by: ['streamId'],
      where: {
        intervalStart: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        uniqueViewers: true,
        totalViewTime: true
      },
      _max: {
        peakViewers: true
      },
      _avg: {
        connectionScore: true
      },
      orderBy: {
        _sum: {
          uniqueViewers: 'desc'
        }
      },
      take: limit
    });

    // Get stream details
    const streamIds = topStreams.map(s => s.streamId);
    const streams = await this.prisma.stream.findMany({
      where: {
        id: {
          in: streamIds
        }
      },
      select: {
        id: true,
        title: true,
        user: {
          select: {
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    // Combine data
    return topStreams.map(stat => {
      const stream = streams.find(s => s.id === stat.streamId);
      return {
        ...stat,
        stream
      };
    });
  }

  // Get analytics summary for dashboard
  async getAnalyticsSummary(
    streamId?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: Prisma.StreamAnalyticsWhereInput = {
      ...(streamId && { streamId }),
      ...(startDate && endDate && {
        intervalStart: {
          gte: startDate,
          lte: endDate
        }
      })
    };

    const [totalStreams, totalViewTime, uniqueViewers, avgQuality] = await Promise.all([
      this.prisma.streamAnalytics.groupBy({
        by: ['streamId'],
        where,
        _count: {
          _all: true
        }
      }),
      this.prisma.streamAnalytics.aggregate({
        where,
        _sum: {
          totalViewTime: true
        }
      }),
      this.prisma.streamAnalytics.aggregate({
        where,
        _sum: {
          uniqueViewers: true
        }
      }),
      this.prisma.streamAnalytics.aggregate({
        where,
        _avg: {
          connectionScore: true,
          averageFps: true,
          averageBitrate: true
        }
      })
    ]);

    return {
      totalStreams: totalStreams.length,
      totalViewTime: totalViewTime._sum.totalViewTime || 0,
      uniqueViewers: uniqueViewers._sum.uniqueViewers || 0,
      averageQuality: {
        connectionScore: avgQuality._avg.connectionScore || 0,
        fps: avgQuality._avg.averageFps || 0,
        bitrate: avgQuality._avg.averageBitrate || 0
      }
    };
  }
}