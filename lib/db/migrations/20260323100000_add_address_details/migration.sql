-- AlterTable
ALTER TABLE "addresses" ADD COLUMN "location_type" TEXT,
ADD COLUMN "floor" TEXT,
ADD COLUMN "apartment_number" TEXT,
ADD COLUMN "company_name" TEXT,
ADD COLUMN "entrance" TEXT,
ADD COLUMN "access_details" TEXT,
ADD COLUMN "delivery_instructions" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "delivery_address_details" JSONB;
