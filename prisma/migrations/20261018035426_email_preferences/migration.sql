-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true;
