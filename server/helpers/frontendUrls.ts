import dotenv from 'dotenv';

dotenv.config();

/**
 * FRONTEND_URL may be a single URL or a comma-separated list of allowed
 * frontend origins (e.g. web app + a preview/staging deployment). This parses
 * it into a clean, trailing-slash-free array.
 */
export function parseFrontendUrls(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/** All allowed frontend origins (used for CORS). */
export const frontendUrls = parseFrontendUrls(process.env.FRONTEND_URL);

/**
 * The primary frontend origin — the first entry. Used wherever a single URL is
 * needed (OAuth redirect URIs, email links).
 */
export const primaryFrontendUrl = frontendUrls[0] ?? '';
