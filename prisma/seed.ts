import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ========== user data ==========
  await prisma.user.upsert({
    where: { email: "agent@example.com" },
    update: {
      role: "agent",
      name: "Test Agent",
    },
    create: {
      email: "agent@example.com",
      name: "Test Agent",
      role: "agent",
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {
      role: "customer",
      name: "Test Customer",
    },
    create: {
      email: "customer@example.com",
      name: "Test Customer",
      role: "customer",
    },
  });

  console.log("✅ Users seeded successfully");

  // ========== car data ==========
  console.log("🚗 Seeding car data...");

  // year（2025–2015）
  const years = Array.from({ length: 11 }, (_, i) => 2025 - i);
  await prisma.carYear.createMany({
    data: years.map((y) => ({ year: y })),
    skipDuplicates: true,
  });
  console.log(`✅ Added ${years.length} years`);

  // make and model
  const carData = [
    {
      make: "Toyota",
      models: ["Camry", "RAV4", "Corolla", "Highlander"],
    },
    {
      make: "Honda",
      models: ["Civic", "Accord", "CR-V", "Pilot"],
    },
    {
      make: "Tesla",
      models: ["Model 3", "Model Y", "Model S", "Model X"],
    },
  ];

  for (const brand of carData) {
    await prisma.carMake.upsert({
      where: { make: brand.make },
      update: {},
      create: {
        make: brand.make,
        models: {
          create: brand.models.map((m) => ({ model: m })),
        },
      },
    });
    console.log(`✅ Added ${brand.make} with ${brand.models.length} models`);
  }

  console.log("🎉 All seed data inserted successfully!");
}

// 
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
