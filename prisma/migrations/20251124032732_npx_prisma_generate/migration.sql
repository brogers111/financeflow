-- DropIndex
DROP INDEX "HealthMetric_userId_date_type_idx";

-- CreateIndex
CREATE INDEX "HealthMetric_date_type_idx" ON "HealthMetric"("date", "type");
