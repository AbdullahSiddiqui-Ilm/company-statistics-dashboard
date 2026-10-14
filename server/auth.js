import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
const options = { N: 16384, r: 8, p: 1 };
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, options);
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, hash) {
  const [salt, encoded] = hash.split(':');
  const actual = await derive(password, salt, 64, options);
  const expected = Buffer.from(encoded, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
const tokenHash = token => createHash('sha256').update(token).digest('hex');
const safeUser = user => ({ id: user.id, name: user.name, email: user.email });
export const cookieName = 'meridian_session';
export function readToken(req) {
  const cookie = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`));
  const token = cookie?.slice(cookieName.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
function credentials(body, signup) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
  if (password.length < (signup ? 10 : 1) || password.length > 128) throw Object.assign(new Error(signup ? 'Use a password with 10–128 characters.' : 'Enter your password.'), { status: 400 });
  if (signup && (!name || name.length > 80)) throw Object.assign(new Error('Enter a name with 1–80 characters.'), { status: 400 });
  return { email, password, name };
}
export function authHandlers(store, { secure = false } = {}) {
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure, path: '/' };
  const dummyHash = hashPassword(randomBytes(32).toString('hex'));
  async function establish(req, res, user) {
    const old = readToken(req);
    if (old) await store.deleteSession(tokenHash(old));
    const token = randomBytes(32).toString('hex');
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    await store.saveSession(tokenHash(token), user.id, new Date(Date.now() + maxAge));
    res.cookie(cookieName, token, { ...cookieOptions, maxAge });
    return safeUser(user);
  }
  const wrap = handler => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { await handler(req, res); }
    catch (error) { if (!error.status) console.error('Authentication storage failed:', error.code || 'storage error'); res.status(error.status || 503).json({ error: error.status ? error.message : 'Account service is unavailable. Check the database and try again.' }); }
  };
  return {
    signup: wrap(async (req, res) => {
      const input = credentials(req.body, true);
      const user = await store.createUser({ id: randomUUID(), name: input.name, email: input.email, passwordHash: await hashPassword(input.password) });
      if (!user) return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      res.status(201).json({ user: await establish(req, res, user) });
    }),
    login: wrap(async (req, res) => {
      const input = credentials(req.body, false);
      const user = await store.findUser(input.email);
      const valid = await verifyPassword(input.password, user?.passwordHash || await dummyHash);
      if (!user || !valid) return res.status(401).json({ error: 'Email or password is incorrect.' });
      res.json({ user: await establish(req, res, user) });
    }),
    me: wrap(async (req, res) => {
      const token = readToken(req);
      const user = token ? await store.sessionUser(tokenHash(token)) : null;
      res.json({ user: user ? safeUser(user) : null });
    }),
    logout: wrap(async (req, res) => {
      const token = readToken(req);
      if (token) await store.deleteSession(tokenHash(token));
      res.clearCookie(cookieName, cookieOptions);
      res.json({ user: null });
    }),
    requireUser: async (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      try {
        const token = readToken(req);
        const user = token ? await store.sessionUser(tokenHash(token)) : null;
        if (!user) return res.status(401).json({ error: 'Please log in to view company statistics.' });
        req.user = safeUser(user); next();
      } catch { res.status(503).json({ error: 'Account service is unavailable.' }); }
    },
  };
}
export function sameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Cross-site requests are not allowed.' });
  if (origin) {
    try { if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Cross-site requests are not allowed.' }); }
    catch { return res.status(403).json({ error: 'Invalid request origin.' }); }
  }
  next();
}
export function authRateLimit() {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, item] of attempts) if (item.expires <= now) attempts.delete(key);
    const key = req.ip;
    const item = attempts.get(key) || { count: 0, expires: now + 15 * 60 * 1000 };
    if (item.count >= 20 || (!attempts.has(key) && attempts.size >= 10000)) {
      res.set('Retry-After', String(Math.ceil((item.expires - now) / 1000)));
      return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
    }
    item.count++; attempts.set(key, item); next();
  };
}
