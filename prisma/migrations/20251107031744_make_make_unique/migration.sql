/*
  Warnings:

  - A unique constraint covering the columns `[make]` on the table `CarMake` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CarMake_make_key" ON "CarMake"("make");
