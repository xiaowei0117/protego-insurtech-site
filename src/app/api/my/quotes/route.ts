import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions as any);
  const userId = (session as any)?.user?.id as string | undefined;
  const userEmail = (session as any)?.user?.email?.toLowerCase?.() as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailFallback =
    userEmail && {
      AND: [{ user_id: null }, { email: userEmail }],
    };

  const executions = await prisma.quote_execution.findMany({
    where: {
      applicant: {
        OR: [{ user_id: userId }, emailFallback].filter(Boolean) as any,
      },
    },
    orderBy: { created_at: "desc" },
    include: {
      applicant: {
        select: {
          id: true,
          email: true,
          user_id: true,
          first_name: true,
          last_name: true,
          xref_key: true,
          coverage_configs: true,
          _count: {
            select: {
              drivers: true,
              vehicles: true,
            },
          },
        },
      },
      quotes: true,
    },
  });

  // Keep only the latest execution per applicant (most recent first)
  const seen = new Set<number>();
  const latestPerApplicant = executions.filter((exec) => {
    if (seen.has(exec.applicant_id)) return false;
    seen.add(exec.applicant_id);
    return true;
  });

  // 一旦通过邮箱兜底命中，就把 applicant 绑定到当前 user，避免后续被其他人同邮箱读取
  if (userId && userEmail) {
    const attachIds = executions
      .map((exec) => exec.applicant)
      .filter((a) => a && !a.user_id && a.email?.toLowerCase() === userEmail)
      .map((a) => a!.id);

    if (attachIds.length) {
      try {
        await prisma.applicant.updateMany({
          where: { id: { in: attachIds } },
          data: { user_id: userId },
        });
      } catch (e) {
        console.warn("attach applicant.user_id failed:", (e as any)?.message);
      }
    }
  }

  return NextResponse.json(latestPerApplicant);
}
