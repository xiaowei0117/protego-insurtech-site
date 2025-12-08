import  prisma  from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: any) {
  const body = await req.json();

  const execution = await prisma.quote_execution.create({
    data: {
      ...body,
      applicant_id: Number(params.applicantId),
    },
  });

  return NextResponse.json(execution);
}
