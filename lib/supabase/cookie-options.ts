// Stay signed in on this device (browser or home-screen app) until 30 days without a visit.
// The cookie is rewritten whenever the session refreshes, so using the site keeps it alive.
export const sessionCookieOptions = { maxAge: 30 * 24 * 60 * 60 } as const;
