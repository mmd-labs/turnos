/**
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} [email]
 */

/**
 * @typedef {Object} AuthSession
 * @property {AuthUser} [user]
 */

/**
 * @typedef {Object} AuthPort
 * @property {(credentials: { username?: string, email?: string, password: string }) => Promise<{ error: any }>} signIn
 * @property {() => Promise<{ error: any }>} signOut
 * @property {() => Promise<{ session: AuthSession | null, error: any }>} getSession
 * @property {(callback: (event: string, session: AuthSession | null) => void) => { unsubscribe: () => void }} onAuthStateChange
 */

export {};
