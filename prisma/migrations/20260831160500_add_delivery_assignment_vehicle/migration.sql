-- AlterTable
ALTER TABLE "DeliveryAssignment" ADD COLUMN     "vehicleId" TEXT;

-- CreateIndex
CREATE INDEX "DeliveryAssignment_vehicleId_idx" ON "DeliveryAssignment"("vehicleId");

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
