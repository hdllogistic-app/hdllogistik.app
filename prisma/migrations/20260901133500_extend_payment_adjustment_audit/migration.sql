-- AlterTable
ALTER TABLE "ManifestPaymentAdjustment" 
  ADD COLUMN "previousPaymentDeliveryMethod" TEXT,
  ADD COLUMN "newPaymentDeliveryMethod" TEXT,
  ADD COLUMN "previousShippingFee" DECIMAL(18,2),
  ADD COLUMN "newShippingFee" DECIMAL(18,2),
  ADD COLUMN "previousCodAmount" DECIMAL(18,2),
  ADD COLUMN "newCodAmount" DECIMAL(18,2),
  ADD COLUMN "settlementMethod" "PaymentMethod",
  ADD COLUMN "transferProofObjectKey" TEXT;
