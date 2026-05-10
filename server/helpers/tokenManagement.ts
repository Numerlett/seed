import { prisma } from '@seed/database';
import { logger } from './logger';

/**
 * Clean up expired and old revoked refresh tokens from the database.
 * Should be run periodically (e.g., daily via a cron job).
 */
export async function cleanupExpiredTokens() {
  try {
    const now = new Date();

    // Delete expired tokens
    const expiredResult = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // Delete revoked tokens older than 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const revokedResult = await prisma.refreshToken.deleteMany({
      where: {
        isRevoked: true,
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    logger.info(
      { expiredCount: expiredResult.count, revokedCount: revokedResult.count },
      'Token cleanup completed',
    );

    return {
      expiredCount: expiredResult.count,
      revokedCount: revokedResult.count,
    };
  } catch (error) {
    logger.error({ err: error }, 'Error cleaning up tokens');
    throw error;
  }
}

/**
 * Revoke all refresh tokens for a specific user.
 * Useful for security purposes (e.g., password reset, account compromise).
 *
 * @param userId - The ID of the user whose tokens should be revoked
 * @returns The number of tokens that were revoked
 */
export async function revokeAllUserTokens(userId: string) {
  try {
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    logger.info({ userId, count: result.count }, 'Revoked refresh tokens');

    return result.count;
  } catch (error) {
    logger.error({ err: error, userId }, 'Error revoking user tokens');
    throw error;
  }
}

/**
 * Revoke all refresh tokens for a user EXCEPT the specified current session.
 * Instagram-style "Log out of all other sessions" feature.
 *
 * @param userId - The ID of the user
 * @param currentTokenId - The token ID to keep active (current session)
 * @returns The number of tokens that were revoked
 */
export async function revokeOtherUserTokens(
  userId: string,
  currentTokenId: string,
) {
  try {
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
        id: { not: currentTokenId },
      },
      data: {
        isRevoked: true,
      },
    });

    logger.info(
      { userId, count: result.count, kept: currentTokenId },
      'Revoked other refresh tokens',
    );

    return result.count;
  } catch (error) {
    logger.error({ err: error, userId }, 'Error revoking other user tokens');
    throw error;
  }
}

/**
 * Get active sessions for a user with enriched device metadata.
 *
 * @param userId - The ID of the user
 * @returns Array of active session objects with device info
 */
export async function getUserActiveSessions(userId: string) {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        clientInfo: true,
        createdAt: true,
        expiresAt: true,
        lastActiveAt: true,
        deviceName: true,
        deviceType: true,
        browser: true,
        os: true,
        location: true,
        ipAddress: true,
        loginMethod: true,
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
    });

    return sessions;
  } catch (error) {
    logger.error({ err: error, userId }, 'Error fetching user sessions');
    throw error;
  }
}

/**
 * Revoke a specific session by token ID.
 *
 * @param tokenId - The ID of the refresh token to revoke
 * @param userId - The user ID (ensures user owns the token)
 * @returns Whether a token was revoked
 */
export async function revokeSession(tokenId: string, userId: string) {
  try {
    const result = await prisma.refreshToken.updateMany({
      where: {
        id: tokenId,
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    return result.count > 0;
  } catch (error) {
    logger.error({ err: error }, 'Error revoking session');
    throw error;
  }
}

/**
 * Update the lastActiveAt timestamp for a session.
 * Called on token refresh to track when a session was last used.
 *
 * @param tokenId - The token DB record ID
 */
export async function touchSession(tokenId: string) {
  try {
    await prisma.refreshToken.update({
      where: { id: tokenId },
      data: { lastActiveAt: new Date() },
    });
  } catch (error) {
    logger.warn({ err: error }, 'Error updating session lastActiveAt');
  }
}

/**
 * Find the current session's token ID from a raw refresh token string.
 *
 * @param refreshToken - The raw JWT refresh token
 * @param userId - The user ID for ownership check
 * @returns The token record ID, or null if not found
 */
export async function findSessionByToken(
  refreshToken: string,
  userId: string,
): Promise<string | null> {
  try {
    const token = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId,
        isRevoked: false,
      },
      select: { id: true },
    });
    return token?.id ?? null;
  } catch (error) {
    logger.error({ err: error }, 'Error finding session by token');
    return null;
  }
}
