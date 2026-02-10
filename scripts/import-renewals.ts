import "dotenv/config";
import path from "path";
import { PrismaClient, Prisma } from "@prisma/client";
import * as XLSXModule from "xlsx";

const prisma = new PrismaClient();

type Row = Record<string, any>;

const argv = process.argv.slice(2);
const fileArg = (() => {
  const direct = argv.find((a) => a.startsWith("--file="));
  if (direct) return direct.split("=").slice(1).join("=");
  const idx = argv.indexOf("--file");
  if (idx >= 0) return argv[idx + 1];
  return "";
})();

const FILE_PATH =
  fileArg ||
  process.env.RENEWAL_XLSX ||
  path.resolve(process.cwd(), "data", "renewal-list", "March_2026.xlsx");

function normalizeHeader(value: string) {
  return value.toLowerCase().trim();
}

function toText(value: any) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function toDate(value: any) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const maybe = new Date(value);
  return Number.isNaN(maybe.getTime()) ? null : maybe;
}

function toNumber(value: any) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function getXlsx() {
  const mod: any = XLSXModule;
  return mod.readFile ? mod : mod.default || mod;
}

function readRows(): Row[] {
  const XLSX = getXlsx();
  const workbook = XLSX.readFile(FILE_PATH, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: null }) as Row[];
}

function mapRow(row: Row) {
  const mapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    mapped[normalizeHeader(key)] = value;
  }

  const policyNumber = toText(mapped["policy number"]);
  const expirationDate = toDate(mapped["expiration date"]);

  const policyPremium = toNumber(mapped["policy premium"]);
  const renewalPremium = toNumber(mapped["renewal premium"]);

  return {
    first_name: toText(mapped["first name"]) || null,
    last_name: toText(mapped["last name"]) || null,
    policy_number: policyNumber,
    expiration_date: expirationDate,
    line_of_business: toText(mapped["line of business"]) || null,
    writing_carrier: toText(mapped["writing carrier"]) || null,
    policy_premium:
      policyPremium === null ? null : new Prisma.Decimal(policyPremium),
    renewal_premium:
      renewalPremium === null ? null : new Prisma.Decimal(renewalPremium),
    agent_name: toText(mapped["agent"]) || null,
    csr_name: toText(mapped["csr"]) || null,
    source_file: path.basename(FILE_PATH),
  };
}

async function main() {
  console.log(`Reading ${FILE_PATH}`);
  const rows = readRows();
  if (!rows.length) {
    console.warn("No rows found in Excel.");
    return;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const mapped = mapRow(row);

    if (!mapped.policy_number) {
      skipped += 1;
      continue;
    }

    const expDate = mapped.expiration_date;
    const lob = mapped.line_of_business;
    const carrier = mapped.writing_carrier;

    let record;
    if (expDate && lob && carrier) {
      record = await prisma.renewal_policy.upsert({
        where: {
          policy_number_expiration_date_line_of_business_writing_carrier: {
            policy_number: mapped.policy_number,
            expiration_date: expDate,
            line_of_business: lob,
            writing_carrier: carrier,
          },
        },
        create: mapped,
        update: mapped,
      });
    } else {
      record = await prisma.renewal_policy.create({
        data: mapped,
      });
    }

    if (record.created_at.getTime() === record.updated_at.getTime()) {
      created += 1;
    } else {
      updated += 1;
    }
  }

  console.log(
    `Done. created=${created} updated=${updated} skipped=${skipped}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
