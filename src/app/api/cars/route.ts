// src/app/api/cars/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // read year from Database, sort by desc
    const years = await prisma.carYear.findMany({
      orderBy: { year: "desc" },
    });

    // read make and model from database
    const makes = await prisma.carMake.findMany({
      include: { models: true }, // get models by make
      orderBy: { make: "asc" },
    });

    return NextResponse.json({ years, makes });
  } catch (error: any) {
    console.error("❌ Error fetching car data:", error);
    return NextResponse.json(
      { error: "Failed to load car data" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
