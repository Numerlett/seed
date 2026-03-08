/*
  Warnings:

  - You are about to drop the column `email` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `picture` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the `admin_refresh_tokens` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `admins` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `admins` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "admin_refresh_tokens" DROP CONSTRAINT "admin_refresh_tokens_adminId_fkey";

-- DropIndex
DROP INDEX "admins_email_key";

-- AlterTable
ALTER TABLE "admins" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone",
DROP COLUMN "picture",
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "admin_refresh_tokens";

-- CreateIndex
CREATE UNIQUE INDEX "admins_userId_key" ON "admins"("userId");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
