import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = (body?.email || "").toLowerCase().trim();
    const name = (body?.name || "").trim() || null;

    if (!emailRaw || !isValidEmail(emailRaw)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    // create or update user as agent
    const user = await prisma.user.upsert({
      where: { email: emailRaw },
      update: {
        role: "agent",
        name: name || undefined,
      },
      create: {
        email: emailRaw,
        name: name,
        role: "agent",
      },
      select: { id: true, email: true, role: true, name: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create agent." }, { status: 500 });
  }
}
