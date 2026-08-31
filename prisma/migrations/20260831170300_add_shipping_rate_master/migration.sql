-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "ratePerKg" DECIMAL(18,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingRate_province_idx" ON "ShippingRate"("province");

-- CreateIndex
CREATE INDEX "ShippingRate_city_idx" ON "ShippingRate"("city");

-- CreateIndex
CREATE INDEX "ShippingRate_active_idx" ON "ShippingRate"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRate_province_city_key" ON "ShippingRate"("province", "city");
