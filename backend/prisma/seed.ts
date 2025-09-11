import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean up existing data
  if (process.env.SKIP_CLEANUP !== 'true') {
    await cleanup();
  } else {
    console.log('⏩ Skipping cleanup (SKIP_CLEANUP=true)');
  }

  // Create roles
  const adminRole = await prisma.roles.create({
    data: {
      name: 'admin',
      active: 1,
    },
  });

  const userRole = await prisma.roles.create({
    data: {
      name: 'user',
      active: 1,
    },
  });

  console.log('✅ Roles created');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@omi.live',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
      roleId: adminRole.id,
    },
  });

  // Regular users
  const regularUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john@example.com',
        username: 'johndoe',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        roleId: userRole.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane@example.com',
        username: 'janesmith',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        roleId: userRole.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'streamer@example.com',
        username: 'thestreamer',
        password: hashedPassword,
        firstName: 'Stream',
        lastName: 'Master',
        roleId: userRole.id,
      },
    }),
  ]);

  console.log('✅ Users created');

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
  console.log(`- Roles: ${await prisma.roles.count()}`);
  console.log(`- Users: ${await prisma.user.count()} (1 admin, 3 regular)`);
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
  await prisma.user.deleteMany();
  await prisma.roles.deleteMany();
  
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