import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeUserStreamer(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'streamer' },
    });
    
    console.log(`✓ Updated user ${user.email} to streamer role`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Stream Key: ${user.streamKey}`);
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('Usage: tsx make-streamer.ts <email>');
  process.exit(1);
}

makeUserStreamer(email);