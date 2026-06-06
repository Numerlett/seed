import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore keys must be alphanumeric with ".", "-" and "_".
const ACCESS_KEY = 'seed_access_token';
const REFRESH_KEY = 'seed_refresh_token';
const BIZ_KEY = 'seed_business_membership_id';

// expo-secure-store is native-only. On web (and SSR) fall back to localStorage
// so the app runs everywhere without crashing.
const storage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) =>
          Promise.resolve(
            typeof localStorage !== 'undefined'
              ? localStorage.getItem(key)
              : null,
          ),
        setItem: (key: string, value: string) => {
          if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : {
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
        removeItem: SecureStore.deleteItemAsync,
      };

// In-memory cache so the tRPC fetch wrapper can read the access token synchronously
// on every request without hitting SecureStore each time.
let memAccess: string | null = null;
let memRefresh: string | null = null;
let hydrated = false;

/** Load persisted tokens into memory once at app startup. */
export async function hydrateTokens(): Promise<void> {
  memAccess = await storage.getItem(ACCESS_KEY);
  memRefresh = await storage.getItem(REFRESH_KEY);
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
  memRefresh = await storage.getItem(REFRESH_KEY);
  return memRefresh;
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  memAccess = accessToken;
  memRefresh = refreshToken;
  await Promise.all([
    storage.setItem(ACCESS_KEY, accessToken),
    storage.setItem(REFRESH_KEY, refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  memAccess = null;
  memRefresh = null;
  await Promise.all([
    storage.removeItem(ACCESS_KEY),
    storage.removeItem(REFRESH_KEY),
  ]);
}

// --- Active business selection (mirrors web's localStorage 'businessMembershipId') ---

export async function getStoredBusinessMembershipId(): Promise<string | null> {
  return storage.getItem(BIZ_KEY);
}

export async function setStoredBusinessMembershipId(id: string): Promise<void> {
  await storage.setItem(BIZ_KEY, id);
}

export async function clearStoredBusinessMembershipId(): Promise<void> {
  await storage.removeItem(BIZ_KEY);
}
