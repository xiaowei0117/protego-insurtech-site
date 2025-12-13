import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ exists: false, error: "email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return NextResponse.json({ exists: Boolean(user) });
  } catch (err: any) {
    return NextResponse.json({ exists: false, error: err?.message }, { status: 400 });
  }
}
