'use server';

import { signOut } from '@/lib/auth';
import { blacklistToken } from '@/lib/token-blacklist';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';
import { jwtDecrypt } from 'jose';
import type { JWT } from 'next-auth/jwt';

export async function handleSignOut() {
  try {
    // Get the JWT token from cookies
    const cookieStore = await cookies();
    const cookieName = process.env.NODE_ENV === 'production'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';

    const tokenCookie = cookieStore.get(cookieName);
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

    if (!secret) {
      logger.error('AUTH_SECRET not configured');
    } else if (tokenCookie?.value) {
      try {
        // Decode the JWT to get the jti claim
        // NextAuth uses JWE (encrypted JWT) by default
        const secretKey = new TextEncoder().encode(secret);
        const { payload } = await jwtDecrypt(tokenCookie.value, secretKey);
        const decoded = payload as JWT;

        if (decoded && decoded.jti) {
          // Calculate token expiration (30 days)
          const maxAge = 30 * 24 * 60 * 60 * 1000;
          const expiresAt = new Date(Date.now() + maxAge);

          // Blacklist the token
          await blacklistToken(decoded.jti, expiresAt);

          logger.info('Token blacklisted on logout', {
            userId: decoded.id,
            jti: decoded.jti,
          });
        }
      } catch (decodeError) {
        logger.error('Failed to decode and blacklist token', {}, decodeError as Error);
        // Continue with logout even if blacklisting fails
      }
    }
  } catch (error) {
    logger.error('Error during logout', {}, error as Error);
    // Continue with logout even if blacklisting fails
  }

  await signOut({ redirectTo: '/login' });
}
