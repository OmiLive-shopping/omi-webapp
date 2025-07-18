#!/usr/bin/env tsx
import { execSync } from 'child_process';
import { program } from 'commander';

program
  .name('seed')
  .description('Database seeding utility')
  .version('1.0.0');

program
  .command('run')
  .description('Run the database seed')
  .option('--no-cleanup', 'Skip cleanup of existing data')
  .action((options) => {
    console.log('🌱 Running database seed...');
    
    if (!options.cleanup) {
      process.env.SKIP_CLEANUP = 'true';
    }
    
    try {
      execSync('npx prisma db seed', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    }
  });

program
  .command('reset')
  .description('Reset database and run seed')
  .action(() => {
    console.log('🔄 Resetting database...');
    
    try {
      execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
      console.log('✅ Database reset complete');
      
      console.log('🌱 Running seed...');
      execSync('npx prisma db seed', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Reset failed:', error);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Clean all data from database')
  .action(async () => {
    console.log('🧹 Cleaning database...');
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      await prisma.comment.deleteMany();
      await prisma.streamProduct.deleteMany();
      await prisma.stream.deleteMany();
      await prisma.$executeRaw`DELETE FROM "_UserWishlist"`;
      await prisma.product.deleteMany();
      await prisma.user.deleteMany();
      await prisma.roles.deleteMany();
      
      console.log('✅ Database cleaned');
    } catch (error) {
      console.error('❌ Clean failed:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

program.parse();