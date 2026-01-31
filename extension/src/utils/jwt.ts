/**
 * Decode JWT token to extract expiration timestamp
 * JWT format: header.payload.signature
 */
export function getJwtExpiration(jwt: string): number | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url payload (second part)
    const payload = parts[1];
    // Replace URL-safe base64 characters
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    
    const decoded = JSON.parse(atob(padded));
    return decoded.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
}

/**
 * Check if JWT token is expired (with 60 second buffer)
 */
export function isJwtExpired(jwt: string, bufferSeconds = 60): boolean {
  const expiration = getJwtExpiration(jwt);
  if (!expiration) {
    return true; // If we can't parse expiration, treat as expired
  }
  return Date.now() >= expiration - bufferSeconds * 1000;
}
