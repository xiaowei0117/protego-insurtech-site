/*
  Warnings:

  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CarMake` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CarModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CarYear` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CarModel" DROP CONSTRAINT "CarModel_makeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropTable
DROP TABLE "public"."Account";

-- DropTable
DROP TABLE "public"."CarMake";

-- DropTable
DROP TABLE "public"."CarModel";

-- DropTable
DROP TABLE "public"."CarYear";

-- DropTable
DROP TABLE "public"."Session";

-- DropTable
DROP TABLE "public"."User";

-- DropTable
DROP TABLE "public"."VerificationToken";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applicants" (
    "id" SERIAL NOT NULL,
    "xref_key" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "birth_date" TIMESTAMP(3),
    "gender" TEXT,
    "marital_status" TEXT,
    "address" TEXT,
    "unit" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "residence" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT DEFAULT 'draft',
    "user_id" TEXT,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" SERIAL NOT NULL,
    "applicant_id" INTEGER NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "birth_date" TIMESTAMP(3),
    "relationship" TEXT,
    "marital_status" TEXT,
    "occupation" TEXT,
    "education" TEXT,
    "dl_number" TEXT,
    "dl_state" TEXT,
    "violations" JSONB NOT NULL DEFAULT '[]',
    "accidents" JSONB NOT NULL DEFAULT '[]',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "applicant_id" INTEGER NOT NULL,
    "vin" TEXT,
    "year" TEXT,
    "make" TEXT,
    "model" TEXT,
    "sub_model" TEXT,
    "ownership" TEXT,
    "usage" TEXT,
    "mileage" TEXT,
    "safety_features" JSONB NOT NULL DEFAULT '[]',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_insurance" (
    "id" SERIAL NOT NULL,
    "applicant_id" INTEGER NOT NULL,
    "has_insurance" TEXT,
    "provider" TEXT,
    "duration" TEXT,
    "bodily_injury_limit" TEXT,
    "lapse_duration" TEXT,
    "claims" JSONB NOT NULL DEFAULT '[]',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "current_insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_configs" (
    "id" SERIAL NOT NULL,
    "applicant_id" INTEGER NOT NULL,
    "bi_pd_liability" TEXT,
    "uninsured_motorist" TEXT,
    "pip" TEXT,
    "collision" TEXT,
    "comprehensive" TEXT,
    "rental" TEXT,
    "roadside_assistance" TEXT,
    "umbrella" TEXT,
    "gap" TEXT,
    "glass_coverage" TEXT,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_executions" (
    "id" SERIAL NOT NULL,
    "applicant_id" INTEGER NOT NULL,
    "quote_execution_id" TEXT NOT NULL,
    "user_id" TEXT,
    "carrier_id" INTEGER,
    "carrier_name" TEXT,
    "status" TEXT,
    "submitted_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "error_message" TEXT,
    "retry_count" INTEGER DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "extra" JSONB,
    "raw_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" SERIAL NOT NULL,
    "applicant_id" INTEGER NOT NULL,
    "quote_execution_id" TEXT,
    "user_id" TEXT,
    "carrier_id" INTEGER,
    "carrier_name" TEXT,
    "premium" DECIMAL(10,2),
    "term" TEXT,
    "deductible" JSONB,
    "discounts" JSONB,
    "fees" JSONB,
    "extra" JSONB,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "applicant_id" INTEGER NOT NULL,
    "event" TEXT,
    "message" TEXT,
    "duration_ms" INTEGER,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "applicants_xref_key_key" ON "applicants"("xref_key");

-- CreateIndex
CREATE UNIQUE INDEX "current_insurance_applicant_id_key" ON "current_insurance"("applicant_id");

-- CreateIndex
CREATE UNIQUE INDEX "coverage_configs_applicant_id_key" ON "coverage_configs"("applicant_id");

-- CreateIndex
CREATE UNIQUE INDEX "quote_executions_quote_execution_id_key" ON "quote_executions"("quote_execution_id");

-- AddForeignKey
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_insurance" ADD CONSTRAINT "current_insurance_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_configs" ADD CONSTRAINT "coverage_configs_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_executions" ADD CONSTRAINT "quote_executions_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_executions" ADD CONSTRAINT "quote_executions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_quote_execution_id_fkey" FOREIGN KEY ("quote_execution_id") REFERENCES "quote_executions"("quote_execution_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
