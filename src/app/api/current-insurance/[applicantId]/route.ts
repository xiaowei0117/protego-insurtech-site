import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: any) {
  const data = await prisma.current_insurance.findFirst({
    where: { applicant_id: Number(params.applicantId) },
  });

  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: any) {
  const body = await req.json();

  const insurance = await prisma.current_insurance.upsert({
    where: { applicant_id: Number(params.applicantId) },
    create: { ...body, applicant_id: Number(params.applicantId) },
    update: body,
  });

  return NextResponse.json(insurance);
}
