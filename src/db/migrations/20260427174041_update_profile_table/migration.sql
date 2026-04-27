/*
  Warnings:

  - You are about to drop the column `sample_size` on the `Profile` table. All the data in the column will be lost.
  - You are about to alter the column `country_id` on the `Profile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2)`.
  - Changed the type of `gender` on the `Profile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "GENDER_TYPE" AS ENUM ('male', 'female');

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "sample_size",
DROP COLUMN "gender",
ADD COLUMN     "gender" "GENDER_TYPE" NOT NULL,
ALTER COLUMN "country_id" SET DATA TYPE VARCHAR(2);
