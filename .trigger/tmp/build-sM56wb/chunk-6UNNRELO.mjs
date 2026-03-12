import {
  require_default
} from "./chunk-6DNKPBNV.mjs";
import {
  __toESM,
  init_esm
} from "./chunk-QA7U3GQ6.mjs";

// src/lib/db.ts
init_esm();
var import_client = __toESM(require_default());
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma || new import_client.PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export {
  prisma
};
//# sourceMappingURL=chunk-6UNNRELO.mjs.map
