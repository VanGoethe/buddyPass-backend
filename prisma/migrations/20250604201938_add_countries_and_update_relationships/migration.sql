/*
  Warnings:

  - You are about to drop the column `country` on the `subscriptions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "country",
ADD COLUMN     "countryId" TEXT;

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "alpha3" TEXT NOT NULL,
    "numericCode" TEXT,
    "continent" TEXT,
    "region" TEXT,
    "currency" TEXT,
    "phoneCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_provider_countries" (
    "id" TEXT NOT NULL,
    "serviceProviderId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_provider_countries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_alpha3_key" ON "countries"("alpha3");

-- CreateIndex
CREATE UNIQUE INDEX "countries_numericCode_key" ON "countries"("numericCode");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_countries_serviceProviderId_countryId_key" ON "service_provider_countries"("serviceProviderId", "countryId");

-- AddForeignKey
ALTER TABLE "service_provider_countries" ADD CONSTRAINT "service_provider_countries_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_provider_countries" ADD CONSTRAINT "service_provider_countries_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
