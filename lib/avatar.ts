/**
 * Adds a cache-busting timestamp to avatar URLs to force refresh
 * Uses a 5-minute cache to avoid excessive refreshing
 */
const avatarCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl || !avatarUrl.startsWith('http')) {
    return null;
  }
  
  // Check cache
  const cached = avatarCache.get(avatarUrl);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.url;
  }
  
  // Create new cached URL
  const separator = avatarUrl.includes('?') ? '&' : '?';
  const cachedUrl = `${avatarUrl}${separator}t=${now}`;
  
  avatarCache.set(avatarUrl, { url: cachedUrl, timestamp: now });
  
  return cachedUrl;
}

/**
 * Gets user initials from username or email
 */
export function getUserInitials(username?: string, email?: string): string {
  if (username && username.length > 0) {
    return username[0].toUpperCase();
  }
  if (email && email.length > 0) {
    return email[0].toUpperCase();
  }
  return 'U';
}
