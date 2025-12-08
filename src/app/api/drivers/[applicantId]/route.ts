import  prisma  from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: any) {
  const drivers = await prisma.driver.findMany({
    where: { applicant_id: Number(params.applicantId) },
  });

  return NextResponse.json(drivers);
}

export async function POST(req: Request, { params }: any) {
  try {
    const data = await req.json();

    const driver = await prisma.driver.create({
      data: {
        ...data,
        applicant_id: Number(params.applicantId),
      },
    });

    return NextResponse.json(driver);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
