-- DropForeignKey
ALTER TABLE "WebsiteProject" DROP CONSTRAINT "WebsiteProject_userId_fkey";

-- AddForeignKey
ALTER TABLE "WebsiteProject" ADD CONSTRAINT "WebsiteProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
