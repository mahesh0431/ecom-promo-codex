-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "optionalInstructions" TEXT,
    "discountPercent" INTEGER NOT NULL DEFAULT 15,
    "quantityLimit" INTEGER NOT NULL DEFAULT 100,
    "initialImageVariantsRequested" INTEGER NOT NULL DEFAULT 1,
    "instagramCaption" TEXT NOT NULL,
    "imagePrompt" TEXT NOT NULL,
    "codexReasoning" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Campaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("codexReasoning", "createdAt", "id", "imagePrompt", "instagramCaption", "optionalInstructions", "productId", "prompt", "userId") SELECT "codexReasoning", "createdAt", "id", "imagePrompt", "instagramCaption", "optionalInstructions", "productId", "prompt", "userId" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX "Campaign_productId_idx" ON "Campaign"("productId");
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
