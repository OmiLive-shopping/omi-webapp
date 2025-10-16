import { PrismaClient } from '@prisma/client';

import { generateSlug, generateUniqueSlug } from '../utils/slug.utils.js';

const prisma = new PrismaClient();

async function generateBrandSlugs() {
  console.log('🔄 Starting slug generation for existing brands...');

  try {
    // Get all brands without slugs
    const brandsWithoutSlugs = await prisma.brand.findMany({
      where: {
        slug: null,
      },
      select: {
        id: true,
        companyName: true,
      },
    });

    console.log(`📊 Found ${brandsWithoutSlugs.length} brands without slugs`);

    let updated = 0;
    let errors = 0;

    for (const brand of brandsWithoutSlugs) {
      try {
        // Generate base slug from company name
        const baseSlug = generateSlug(brand.companyName);

        // Check if slug already exists
        let finalSlug = baseSlug;
        let counter = 1;

        while (await prisma.brand.findUnique({ where: { slug: finalSlug } })) {
          finalSlug = generateUniqueSlug(baseSlug, counter);
          counter++;
        }

        // Update brand with generated slug
        await prisma.brand.update({
          where: { id: brand.id },
          data: { slug: finalSlug },
        });

        console.log(`✅ Updated brand "${brand.companyName}" with slug: ${finalSlug}`);
        updated++;
      } catch (error) {
        console.error(`❌ Error updating brand ${brand.id}:`, error);
        errors++;
      }
    }

    console.log(`\n📝 Summary:`);
    console.log(`   - Total brands processed: ${brandsWithoutSlugs.length}`);
    console.log(`   - Successfully updated: ${updated}`);
    console.log(`   - Errors: ${errors}`);

    if (updated > 0) {
      console.log(`\n✅ Successfully generated slugs for ${updated} brands!`);
    }

    if (errors > 0) {
      console.log(`\n⚠️ ${errors} brands failed to update. Check logs for details.`);
    }
  } catch (error) {
    console.error('❌ Failed to generate brand slugs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateBrandSlugs()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
