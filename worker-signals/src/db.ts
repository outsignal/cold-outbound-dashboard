// Shared Prisma client singleton for the worker-signals package.
// Import from here instead of creating new PrismaClient instances — avoids
// multiple connection pool instances within the same process.

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
