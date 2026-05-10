import { prisma } from '@seed/database';

/**
 * Delete OTP records that have expired and were never verified.
 * Safe to run as a periodic cleanup (e.g. every hour via a BullMQ scheduled job).
 * Returns the count of deleted records.
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const result = await prisma.otp.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}
