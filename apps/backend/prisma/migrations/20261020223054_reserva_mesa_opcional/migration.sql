-- DropForeignKey
ALTER TABLE "Reserva" DROP CONSTRAINT "Reserva_mesaId_fkey";

-- AlterTable
ALTER TABLE "Reserva" ALTER COLUMN "mesaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
