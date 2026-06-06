import * as SecureStore from 'expo-secure-store';

// SecureStore keys must be alphanumeric with ".", "-" and "_".
const ACCESS_KEY = 'seed_access_token';
const REFRESH_KEY = 'seed_refresh_token';
const BIZ_KEY = 'seed_business_membership_id';

// In-memory cache so the tRPC fetch wrapper can read the access token synchronously
// on every request without hitting SecureStore each time.
let memAccess: string | null = null;
let memRefresh: string | null = null;
let hydrated = false;

/** Load persisted tokens into memory once at app startup. */
export async function hydrateTokens(): Promise<void> {
  memAccess = await SecureStore.getItemAsync(ACCESS_KEY);
  memRefresh = await SecureStore.getItemAsync(REFRESH_KEY);
  hydrated = true;
}

export function isHydrated(): boolean {
  return hydrated;
}

export function getAccessTokenSync(): string | null {
  return memAccess;
}

export function hasTokenSync(): boolean {
  return !!memAccess;
}

export async function getRefreshToken(): Promise<string | null> {
  if (memRefresh) return memRefresh;
  memRefresh = await SecureStore.getItemAsync(REFRESH_KEY);
  return memRefresh;
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  memAccess = accessToken;
  memRefresh = refreshToken;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  memAccess = null;
  memRefresh = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

// --- Active business selection (mirrors web's localStorage 'businessMembershipId') ---

export async function getStoredBusinessMembershipId(): Promise<string | null> {
  return SecureStore.getItemAsync(BIZ_KEY);
}

export async function setStoredBusinessMembershipId(id: string): Promise<void> {
  await SecureStore.setItemAsync(BIZ_KEY, id);
}

export async function clearStoredBusinessMembershipId(): Promise<void> {
  await SecureStore.deleteItemAsync(BIZ_KEY);
}
