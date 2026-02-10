-- DropIndex
DROP INDEX "public"."Chunk_embedding_idx";

-- CreateTable
CREATE TABLE "renewal_policies" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "policy_number" TEXT NOT NULL,
    "expiration_date" TIMESTAMP(3),
    "line_of_business" TEXT,
    "writing_carrier" TEXT,
    "policy_premium" DECIMAL(12,2),
    "renewal_premium" DECIMAL(12,2),
    "agent_name" TEXT,
    "csr_name" TEXT,
    "source_file" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renewal_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "renewal_policies_policy_number_expiration_date_line_of_busi_key" ON "renewal_policies"("policy_number", "expiration_date", "line_of_business", "writing_carrier");
