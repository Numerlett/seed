// Backend base URL. On a physical device this MUST be the host machine's LAN IP
// (e.g. http://192.168.1.10:8080), set via EXPO_PUBLIC_SERVER_BASE_URL in mobile/.env.
// localhost only works in a simulator/emulator running on the same machine as the server.
export const SERVER_BASE_URL =
  process.env.EXPO_PUBLIC_SERVER_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:8080';

export const API_URL = `${SERVER_BASE_URL}/api`;
