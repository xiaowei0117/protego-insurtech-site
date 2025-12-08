import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: any) {
  const vehicles = await prisma.vehicle.findMany({
    where: { applicant_id: Number(params.applicantId) },
  });

  return NextResponse.json(vehicles);
}

export async function POST(req: Request, { params }: any) {
  try {
    const data = await req.json();

    const vehicle = await prisma.vehicle.create({
      data: {
        ...data,
        applicant_id: Number(params.applicantId),
      },
    });

    return NextResponse.json(vehicle);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
