import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create categories
  const haircut = await prisma.serviceCategory.upsert({
    where: { name: 'Haircut' },
    update: {},
    create: { name: 'Haircut', description: 'Hair cutting services' },
  });

  const perm = await prisma.serviceCategory.upsert({
    where: { name: 'Perm' },
    update: {},
    create: { name: 'Perm', description: 'Permanent wave services' },
  });

  const colouring = await prisma.serviceCategory.upsert({
    where: { name: 'Colouring' },
    update: {},
    create: { name: 'Colouring', description: 'Hair colouring services' },
  });

  const otherServices = await prisma.serviceCategory.upsert({
    where: { name: 'Other Services' },
    update: {},
    create: { name: 'Other Services', description: 'Additional salon services' },
  });

  console.log('✅ Categories created');

  // Haircut services
  const haircutServices = [
    { name: "Men's Haircut", duration: 30, price: 30 },
    { name: 'Bang', duration: 5, price: 15 },
    { name: "Women's Haircut", duration: 30, price: 35 },
    { name: "Girl's Haircut (U12)", duration: 30, price: 30 },
    { name: "Boy's Haircut (U12)", duration: 30, price: 25 },
  ];

  for (const service of haircutServices) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (!existing) {
      await prisma.service.create({
        data: {
          name: service.name,
          description: service.name,
          price: service.price,
          baseDuration: service.duration,
          categoryId: haircut.id,
          isActive: true,
        },
      });
    }
  }

  console.log('✅ Haircut services created');

  // Perm services
  const permServices = [
    { name: 'Bang Perm', duration: 40, price: 60 },
    { name: 'Treatment Straight Perm', duration: 120, price: 280 },
    { name: 'Volume C-Curl Perm', duration: 120, price: 280 },
    { name: 'Korean Heating Perm', duration: 120, price: 180 },
    { name: "Women's Perm", duration: 90, price: 120 },
    { name: "Down Perm w/ Cut", duration: 40, price: 100 },
    { name: "Men's Perm", duration: 60, price: 100 },
  ];

  for (const service of permServices) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (!existing) {
      await prisma.service.create({
        data: {
          name: service.name,
          description: service.name,
          price: service.price,
          baseDuration: service.duration,
          categoryId: perm.id,
          isActive: true,
        },
      });
    }
  }

  console.log('✅ Perm services created');

  // Colouring services
  const colouringServices = [
    { name: 'Color - add on Toner to Cut', duration: 90, price: 240 },
    { name: 'Foil 1/2 and Root Retouch', duration: 90, price: 260 },
    { name: 'Foil 1/4 and Root Retouch', duration: 90, price: 240 },
    { name: 'Color Retouch', duration: 50, price: 115 },
    { name: 'Foil 1/4 Head', duration: 40, price: 180 },
    { name: 'Color-Express Root Retouch', duration: 60, price: 180 },
    { name: 'Foils - Face Framing', duration: 60, price: 130 },
    { name: 'Balayage', duration: 120, price: 280 },
    { name: 'Bleach', duration: 60, price: 100 },
    { name: 'Highlights 1/2 Foil', duration: 90, price: 220 },
    { name: 'Root Touch-up', duration: 60, price: 70 },
    { name: 'Full Foil Highlights', duration: 90, price: 250 },
    { name: 'Full Colour', duration: 90, price: 150 },
  ];

  for (const service of colouringServices) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (!existing) {
      await prisma.service.create({
        data: {
          name: service.name,
          description: service.name,
          price: service.price,
          baseDuration: service.duration,
          categoryId: colouring.id,
          isActive: true,
        },
      });
    }
  }

  console.log('✅ Colouring services created');

  // Other services
  const otherServicesList = [
    { name: 'Upstyle', duration: 40, price: 75 },
    { name: 'Blow-Dry and Heat Styling', duration: 30, price: 45 },
    { name: 'Defy Damage Treatment System', duration: 30, price: 45 },
    { name: 'Scalp Massage Shampoo', duration: 30, price: 30 },
    { name: 'Special Treatment', duration: 60, price: 120 },
    { name: 'Treatment', duration: 60, price: 60 },
    { name: 'Shampoo', duration: 10, price: 5 },
  ];

  for (const service of otherServicesList) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (!existing) {
      await prisma.service.create({
        data: {
          name: service.name,
          description: service.name,
          price: service.price,
          baseDuration: service.duration,
          categoryId: otherServices.id,
          isActive: true,
        },
      });
    }
  }

  console.log('✅ Other services created');

  console.log('🎉 Database seeding completed successfully!');
  console.log(`
    Categories created: 4
    Total services created: 27
    - Haircut: 5 services
    - Perm: 7 services
    - Colouring: 13 services
    - Other Services: 7 services
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
