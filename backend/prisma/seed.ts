import { PrismaClient } from '@prisma/client';
import { auth } from '../src/auth.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean up existing data
  if (process.env.SKIP_CLEANUP !== 'true') {
    await cleanup();
  } else {
    console.log('⏩ Skipping cleanup (SKIP_CLEANUP=true)');
  }

  console.log('✅ Using UserRole enum (no separate Roles table needed)');

  // Create users using Better Auth API (ensures consistency with real signup flow)
  console.log('👤 Creating admin user via Better Auth...');
  const adminSignup = await auth.api.signUpEmail({
    body: {
      email: 'admin@omi.live',
      password: 'password123',
      name: 'Admin User',
      username: 'admin', // Custom field from additionalFields
    },
  });

  if (!adminSignup || !adminSignup.user) {
    throw new Error('Failed to create admin user');
  }

  // Update admin user with additional fields and admin privileges
  const adminUser = await prisma.user.update({
    where: { id: adminSignup.user.id },
    data: {
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
      role: 'admin',
    },
  });

  // Regular users
  console.log('👥 Creating regular users via Better Auth...');
  const userSignups = await Promise.all([
    auth.api.signUpEmail({
      body: {
        email: 'john@example.com',
        password: 'password123',
        name: 'John Doe',
        username: 'johndoe', // Custom field from additionalFields
      },
    }),
    auth.api.signUpEmail({
      body: {
        email: 'jane@example.com',
        password: 'password123',
        name: 'Jane Smith',
        username: 'janesmith', // Custom field from additionalFields
      },
    }),
    auth.api.signUpEmail({
      body: {
        email: 'streamer@example.com',
        password: 'password123',
        name: 'Stream Master',
        username: 'thestreamer', // Custom field from additionalFields
      },
    }),
  ]);

  // Extract user objects and update with additional fields
  const regularUsers = await Promise.all(
    userSignups.map(async (signup, index) => {
      if (!signup || !signup.user) {
        throw new Error(`Failed to create user at index ${index}`);
      }

      const userData: { firstName: string; lastName: string; role?: 'streamer' } = {
        firstName: ['John', 'Jane', 'Stream'][index],
        lastName: ['Doe', 'Smith', 'Master'][index],
      };

      // Update the third user (index 2) to be a streamer
      if (index === 2) {
        userData.role = 'streamer';
      }

      return prisma.user.update({
        where: { id: signup.user.id },
        data: userData,
      });
    }),
  );

  console.log('✅ Users created via Better Auth (accounts automatically created)');

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Premium Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
        url: 'https://example.com/headphones',
        couponCode: 'SAVE20',
        couponExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    }),
    prisma.product.create({
      data: {
        name: 'Gaming Keyboard',
        description: 'RGB mechanical keyboard for gaming enthusiasts',
        imageUrl: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae',
        url: 'https://example.com/keyboard',
        couponCode: 'GAMER15',
        couponExpiration: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      },
    }),
    prisma.product.create({
      data: {
        name: 'Webcam HD',
        description: 'Professional HD webcam for streaming',
        imageUrl: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c',
        url: 'https://example.com/webcam',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Microphone Pro',
        description: 'Studio-quality USB microphone',
        imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc',
        url: 'https://example.com/microphone',
        couponCode: 'STREAM10',
        couponExpiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    }),
    prisma.product.create({
      data: {
        name: 'LED Ring Light',
        description: 'Perfect lighting for video streaming',
        imageUrl: 'https://images.unsplash.com/photo-1606986628253-05620e9b0a80',
        url: 'https://example.com/ringlight',
        active: false, // Inactive product
      },
    }),
  ]);

  console.log('✅ Products created');

  // Add products to wishlists
  await prisma.user.update({
    where: { id: regularUsers[0].id },
    data: {
      wishlist: {
        connect: [{ id: products[0].id }, { id: products[2].id }],
      },
    },
  });

  await prisma.user.update({
    where: { id: regularUsers[1].id },
    data: {
      wishlist: {
        connect: [{ id: products[1].id }, { id: products[3].id }],
      },
    },
  });

  console.log('✅ Wishlists populated');

  // Create streams
  const streamerUser = regularUsers[2];
  const now = new Date();

  // Past stream (ended)
  const pastStream = await prisma.stream.create({
    data: {
      title: 'Gaming Marathon - Completed',
      description: 'An epic 12-hour gaming marathon that was amazing!',
      scheduled: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      userId: streamerUser.id,
      isLive: false,
      viewerCount: 0,
      startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // 12 hours later
    },
  });

  // Currently live stream
  const liveStream = await prisma.stream.create({
    data: {
      title: '🔴 LIVE NOW: Tech Talk Tuesday',
      description: 'Discussing the latest in web development and streaming tech',
      scheduled: new Date(now.getTime() - 30 * 60 * 1000), // Started 30 minutes ago
      userId: streamerUser.id,
      isLive: true,
      viewerCount: 245,
      startedAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
  });

  // Upcoming streams
  const upcomingStreams = await Promise.all([
    prisma.stream.create({
      data: {
        title: 'Product Review: Best Streaming Gear 2025',
        description: 'Reviewing and comparing the latest streaming equipment',
        scheduled: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        userId: streamerUser.id,
      },
    }),
    prisma.stream.create({
      data: {
        title: 'Coding Session: Building a Live Chat',
        description: 'Live coding a real-time chat application with Socket.io',
        scheduled: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        userId: streamerUser.id,
      },
    }),
    prisma.stream.create({
      data: {
        title: 'Community Q&A Session',
        description: 'Ask me anything about streaming, coding, or content creation',
        scheduled: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        userId: adminUser.id, // Admin hosting this one
      },
    }),
  ]);

  console.log('✅ Streams created');

  // Assign products to streams
  await prisma.streamProduct.createMany({
    data: [
      // Live stream products
      { streamId: liveStream.id, productId: products[0].id, order: 1 },
      { streamId: liveStream.id, productId: products[1].id, order: 2 },
      { streamId: liveStream.id, productId: products[3].id, order: 3 },
      // Upcoming stream products
      { streamId: upcomingStreams[0].id, productId: products[0].id, order: 1 },
      { streamId: upcomingStreams[0].id, productId: products[2].id, order: 2 },
      { streamId: upcomingStreams[0].id, productId: products[3].id, order: 3 },
      { streamId: upcomingStreams[1].id, productId: products[1].id, order: 1 },
    ],
  });

  console.log('✅ Products assigned to streams');

  // TODO: Add comments when Comment model is implemented
  // const comments = await Promise.all([
  //   prisma.comment.create({
  //     data: {
  //       content: 'Great stream! Love the content 🎉',
  //       userId: regularUsers[0].id,
  //       streamId: liveStream.id,
  //     },
  //   }),
  //   // ... more comments
  // ]);

  console.log('✅ Comments setup skipped (Comment model not implemented yet)');

  // Summary
  console.log('\n📊 Seed Summary:');
  console.log(`- Users: ${await prisma.user.count()} (1 admin, 1 streamer, 2 regular)`);
  console.log(`- Products: ${await prisma.product.count()} (4 active, 1 inactive)`);
  console.log(`- Streams: ${await prisma.stream.count()} (1 past, 1 live, 3 upcoming)`);
  console.log(`- Stream Products: ${await prisma.streamProduct.count()}`);
  // console.log(`- Comments: ${await prisma.comment.count()}`); // TODO: When Comment model is added

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('Admin: admin@omi.live / password123');
  console.log('Users: john@example.com, jane@example.com, streamer@example.com / password123');
}

async function cleanup() {
  console.log('🧹 Cleaning up existing data...');

  // Delete in correct order to respect foreign key constraints
  await prisma.productAudit.deleteMany();
  await prisma.streamProduct.deleteMany();
  await prisma.stream.deleteMany();
  await prisma.$executeRaw`DELETE FROM "_UserWishlist"`;
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.account.deleteMany(); // Clean Better Auth accounts
  await prisma.session.deleteMany(); // Clean sessions
  await prisma.user.deleteMany();
  // Roles table no longer exists - using UserRole enum instead

  console.log('✅ Cleanup completed');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });