import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

function logSave(step: number | string, applicantId: any, payload: any) {
  console.log(
    `🗄️ [save-step] step=${step} applicantId=${applicantId ?? "new"} data=`,
    payload
  );
}

function toISODate(dateString?: string) {
  if (!dateString) return null;
  return new Date(dateString).toISOString();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id as string | undefined;
    const body = await req.json();
    const { step, applicantId, data, xrefKey } = body;

    let applicant;

    // ======================
    // ▶ CREATE APPLICANT
    // ======================
    if (!applicantId) {
      if (step && step !== 1) {
        return NextResponse.json(
          { error: "applicantId is required after step 1" },
          { status: 400 }
        );
      }

      const formatted = {
        ...data,
        birth_date: toISODate(data.birthDate || data.birth_date),
        status: "draft",
        xref_key: xrefKey || data?.xref_key || null,
        user_id: userId || null,
      };

      applicant = await prisma.applicant.create({
        data: formatted,
      });

      logSave("create-applicant", applicant.id, formatted);
      return NextResponse.json({ applicantId: applicant.id });
    }

    // ======================
    // ▶ Applicant Must Exist
    // ======================
    applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant) {
      return NextResponse.json(
        { error: "Applicant not found" },
        { status: 404 }
      );
    }

    // ⛑️ 回填缺少的 xref_key
    if ((!applicant.xref_key && xrefKey) || (!applicant.user_id && userId)) {
      try {
        await prisma.applicant.update({
          where: { id: applicantId },
          data: {
            xref_key: applicant.xref_key || xrefKey,
            user_id: applicant.user_id || userId || null,
          },
        });
      } catch (e) {
        console.warn("xref_key update skipped:", (e as any)?.message);
      }
    }

    // ======================
    // ▶ STEP 1 – Applicant
    // ======================
    if (step === 1) {
      const formatted = {
        ...data,
        birth_date: toISODate(data.birthDate || data.birth_date),
      };

      const updateData: any = { ...formatted };
      if (xrefKey) updateData.xref_key = xrefKey;
      if (userId) updateData.user_id = userId;

      await prisma.applicant.update({
        where: { id: applicantId },
        data: updateData,
      });

      logSave(1, applicantId, formatted);
    }

    // ======================
    // ▶ STEP 2 – Vehicles
    // ======================
    if (step === 2) {
      logSave(2, applicantId, data);

      await prisma.vehicle.deleteMany({ where: { applicant_id: applicantId } });

      await prisma.vehicle.createMany({
        data: data.map((v: any) => ({
          ...v,
          applicant_id: applicantId,
        })),
      });
    }

    // ======================
    // ▶ STEP 3 – Drivers
    // ======================
    if (step === 3) {
      logSave(3, applicantId, data);

      await prisma.driver.deleteMany({ where: { applicant_id: applicantId } });

      await prisma.driver.createMany({
        data: data.map((d: any) => ({
          ...d,
          birth_date: toISODate(d.birthDate || d.birth_date),
          applicant_id: applicantId,
        })),
      });
    }

    // ======================
    // ▶ STEP 4 – Current Insurance
    // ======================
    if (step === 4) {
      logSave(4, applicantId, data);

      // 某些旧表可能缺少 applicant_id 的唯一索引，upsert 会因 ON CONFLICT 失败。
      // 这里改成先查再单独 update/create，避免依赖唯一约束。
      const existing = await prisma.current_insurance.findFirst({
        where: { applicant_id: applicantId },
      });

      if (existing) {
        await prisma.current_insurance.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.current_insurance.create({
          data: {
            applicant_id: applicantId,
            ...data,
          },
        });
      }
    }

    // ======================
    // ▶ STEP 5 – Coverage Config
    // ======================
    if (step === 5) {
      logSave(5, applicantId, data);

      const existing = await prisma.coverage_config.findFirst({
        where: { applicant_id: applicantId },
      });

      if (existing) {
        await prisma.coverage_config.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.coverage_config.create({
          data: {
            applicant_id: applicantId,
            ...data,
          },
        });
      }
    }

    return NextResponse.json({ success: true, applicantId });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
