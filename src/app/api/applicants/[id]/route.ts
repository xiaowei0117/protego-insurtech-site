import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type ParamsCtx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: ParamsCtx) {
  const { id } = await ctx.params;

  const applicant = await prisma.applicant.findUnique({
    where: { id: Number(id) },
    include: {
      drivers: true,
      vehicles: true,
      current_insurance: true,
      coverage_configs: true,
      quote_executions: true,
      quotes: true,
    },
  });

  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(applicant);
}

export async function PUT(req: Request, ctx: ParamsCtx) {
  const { id } = await ctx.params;

  try {
    const data = await req.json();

    const updated = await prisma.applicant.update({
      where: { id: Number(id) },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(_: Request, ctx: ParamsCtx) {
  const { id } = await ctx.params;

  await prisma.applicant.delete({
    where: { id: Number(id) },
  });

  return NextResponse.json({ success: true });
}
