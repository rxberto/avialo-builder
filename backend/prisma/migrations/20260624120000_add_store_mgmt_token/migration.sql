-- Token máquina por tenant para que el panel del cliente gestione su tienda vía el orquestador.
ALTER TABLE "User" ADD COLUMN "storeMgmtToken" TEXT;

-- Único: cada token identifica a un solo tenant (lo usa el middleware de scope).
CREATE UNIQUE INDEX "User_storeMgmtToken_key" ON "User"("storeMgmtToken");
