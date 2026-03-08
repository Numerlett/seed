/**
 * Device and User-Agent parser for session management.
 *
 * Parses user-agent strings to extract structured device information
 * including browser name/version, operating system, device type, and
 * a human-readable device name (Instagram-style).
 */

export interface ParsedDevice {
  /** Human-readable device name, e.g. "Chrome on Windows" */
  deviceName: string;
  /** Device category: 'mobile', 'tablet', or 'desktop' */
  deviceType: 'desktop' | 'mobile' | 'tablet';
  /** Browser name and optional version, e.g. "Chrome 120" */
  browser: string;
  /** Operating system name, e.g. "Windows 10", "iOS 17" */
  os: string;
}

/**
 * Parse a raw User-Agent string into structured device information.
 *
 * @param userAgent - The User-Agent header string from the HTTP request
 * @returns Parsed device info with browser, OS, type, and friendly name
 */
export function parseUserAgent(userAgent?: string): ParsedDevice {
  if (!userAgent) {
    return {
      deviceName: 'Unknown Device',
      deviceType: 'desktop',
      browser: 'Unknown',
      os: 'Unknown',
    };
  }

  const browser = parseBrowser(userAgent);
  const os = parseOS(userAgent);
  const deviceType = parseDeviceType(userAgent);
  const deviceName = `${browser} on ${os}`;

  return { deviceName, deviceType, browser, os };
}

/**
 * Detect the browser name and major version from a user-agent string.
 */
function parseBrowser(ua: string): string {
  // Order matters — check more specific patterns first

  // Edge (Chromium)
  const edg = ua.match(/Edg(?:e|A|iOS)?\/(\d+)/);
  if (edg) return `Edge ${edg[1]}`;

  // Opera / OPR
  const opera = ua.match(/(?:OPR|Opera)\/(\d+)/);
  if (opera) return `Opera ${opera[1]}`;

  // Samsung Internet
  const samsung = ua.match(/SamsungBrowser\/(\d+)/);
  if (samsung) return `Samsung Internet ${samsung[1]}`;

  // Brave (identifies itself as Chrome but with "Brave" in the UA)
  if (ua.includes('Brave')) {
    const brave = ua.match(/Brave\/(\d+)/) || ua.match(/Chrome\/(\d+)/);
    return brave ? `Brave ${brave[1]}` : 'Brave';
  }

  // UC Browser
  const uc = ua.match(/UCBrowser\/(\d+)/);
  if (uc) return `UC Browser ${uc[1]}`;

  // Firefox
  const firefox = ua.match(/Firefox\/(\d+)/);
  if (firefox) return `Firefox ${firefox[1]}`;

  // Chrome (must be after Edge and Opera checks)
  const chrome = ua.match(/Chrome\/(\d+)/);
  if (chrome && !ua.includes('Edg') && !ua.includes('OPR')) {
    return `Chrome ${chrome[1]}`;
  }

  // Safari (must be after Chrome check)
  const safari = ua.match(/Version\/(\d+).*Safari/);
  if (safari) return `Safari ${safari[1]}`;

  // Mobile app WebViews
  if (ua.includes('Instagram')) return 'Instagram App';
  if (ua.includes('FBAN') || ua.includes('FBAV')) return 'Facebook App';
  if (ua.includes('Twitter')) return 'Twitter App';

  // Generic fallback
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Chrome')) return 'Chrome';

  return 'Unknown Browser';
}

/**
 * Detect the operating system from a user-agent string.
 */
function parseOS(ua: string): string {
  // iOS
  const ios = ua.match(/(?:iPhone|iPad|iPod).*?OS (\d+[_\.]\d+)/);
  if (ios) {
    const version = ios[1].replace('_', '.');
    if (ua.includes('iPad')) return `iPadOS ${version}`;
    return `iOS ${version}`;
  }

  // macOS
  const mac = ua.match(/Mac OS X (\d+[_\.]\d+)/);
  if (mac) {
    const version = mac[1].replace('_', '.');
    return `macOS ${version}`;
  }

  // Android
  const android = ua.match(/Android (\d+(?:\.\d+)?)/);
  if (android) return `Android ${android[1]}`;

  // Windows
  if (ua.includes('Windows NT 10.0')) {
    // Windows 11 has the same NT version but sometimes includes a build hint
    if (
      ua.includes('Windows NT 10.0; Win64') &&
      ua.match(/Build\/(\d+)/) !== null
    ) {
      const build = ua.match(/Build\/(\d+)/);
      if (build && parseInt(build[1]) >= 22000) return 'Windows 11';
    }
    return 'Windows 10';
  }
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (ua.includes('Windows NT 6.1')) return 'Windows 7';
  if (ua.includes('Windows')) return 'Windows';

  // Chrome OS
  if (ua.includes('CrOS')) return 'Chrome OS';

  // Linux
  if (ua.includes('Ubuntu')) return 'Ubuntu Linux';
  if (ua.includes('Fedora')) return 'Fedora Linux';
  if (ua.includes('Linux')) return 'Linux';

  return 'Unknown OS';
}

/**
 * Determine the device type from a user-agent string.
 *
 * @returns 'mobile', 'tablet', or 'desktop'
 */
function parseDeviceType(ua: string): 'desktop' | 'mobile' | 'tablet' {
  // Tablets
  if (
    ua.includes('iPad') ||
    ua.includes('Tablet') ||
    (ua.includes('Android') && !ua.includes('Mobile'))
  ) {
    return 'tablet';
  }

  // Mobile
  if (
    ua.includes('Mobile') ||
    ua.includes('iPhone') ||
    ua.includes('iPod') ||
    ua.includes('Android') ||
    ua.includes('webOS') ||
    ua.includes('BlackBerry') ||
    ua.includes('Opera Mini') ||
    ua.includes('IEMobile')
  ) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Extract a readable IP address from request headers.
 * Handles x-forwarded-for chains and normalizes IPv6-mapped IPv4.
 *
 * @param xForwardedFor - The x-forwarded-for header value
 * @param remoteAddress - The socket remote address fallback
 * @returns A clean IP address string
 */
export function extractIpAddress(
  xForwardedFor?: string | string[],
  remoteAddress?: string,
): string {
  let ip: string;

  if (xForwardedFor) {
    // x-forwarded-for can be a comma-separated list; take the first (client) IP
    const forwarded = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor;
    ip = forwarded.split(',')[0].trim();
  } else {
    ip = remoteAddress || 'Unknown';
  }

  // Normalize IPv6-mapped IPv4 addresses (e.g., ::ffff:127.0.0.1 → 127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  return ip;
}
