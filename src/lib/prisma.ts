import { PrismaClient } from '@prisma/client'
import { app } from '@/lib/config/env'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (app.nodeEnv !== 'production') globalForPrisma.prisma = prisma