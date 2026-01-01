-- Ensure pgvector extension exists before using vector type
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "lob" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "program" TEXT,
    "version" TEXT,
    "docName" TEXT,
    "sourcePath" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "lob" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "program" TEXT,
    "version" TEXT,
    "page" TEXT,
    "chunk" TEXT NOT NULL,
    "embedding" vector NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chunk_carrier_lob_state_program_version_idx" ON "Chunk"("carrier", "lob", "state", "program", "version");

-- Ensure vector dimension and index for similarity search
ALTER TABLE "Chunk" ALTER COLUMN "embedding" TYPE vector(768);
CREATE INDEX "Chunk_embedding_idx" ON "Chunk" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
