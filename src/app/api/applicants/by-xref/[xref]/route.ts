import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const includeRelations = {
  drivers: true,
  vehicles: true,
  current_insurance: true,
  coverage_configs: true,
  quote_executions: true,
  quotes: true,
};

export async function GET(_: Request, ctx: { params: Promise<{ xref: string }> }) {
  const { xref } = await ctx.params;

  const applicant = await prisma.applicant.findUnique({
    where: { xref_key: xref },
    include: includeRelations,
  });

  if (!applicant)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(applicant);
}
