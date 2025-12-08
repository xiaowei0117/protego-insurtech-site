import { NextResponse } from "next/server";
import  prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const applicant = await prisma.applicant.create({
      data,
    });

    return NextResponse.json(applicant);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function GET() {
  const list = await prisma.applicant.findMany({
    orderBy: { id: "desc" },
  });
  return NextResponse.json(list);
}
