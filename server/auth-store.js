// The in-memory store keeps demo mode usable; accounts disappear on restart.
export function memoryAuthStore() {
  const users = new Map();
  const sessions = new Map();
  return {
    async createUser(user) {
      if (users.has(user.email)) return null;
      users.set(user.email, user);
      return user;
    },
    async findUser(email) { return users.get(email); },
    async saveSession(hash, userId, expiresAt) {
      for (const [key, session] of sessions) if (session.expiresAt <= new Date()) sessions.delete(key);
      sessions.set(hash, { userId, expiresAt });
    },
    async sessionUser(hash) {
      const session = sessions.get(hash);
      if (!session || session.expiresAt <= new Date()) { sessions.delete(hash); return null; }
      return [...users.values()].find(user => user.id === session.userId);
    },
    async deleteSession(hash) { sessions.delete(hash); },
  };
}
export function postgresAuthStore(pool) {
  const user = row => row && ({ id: row.id, name: row.name, email: row.email, passwordHash: row.password_hash });
  return {
    async createUser(account) {
      const result = await pool.query('INSERT INTO users (id, name, email, password_hash) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING RETURNING *', [account.id, account.name, account.email, account.passwordHash]);
      return user(result.rows[0]);
    },
    async findUser(email) { return user((await pool.query('SELECT * FROM users WHERE email=$1', [email])).rows[0]); },
    async saveSession(hash, userId, expiresAt) {
      await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
      await pool.query('INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,$3)', [hash, userId, expiresAt]);
    },
    async sessionUser(hash) {
      return user((await pool.query('SELECT u.* FROM users u JOIN auth_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at > NOW()', [hash])).rows[0]);
    },
    async deleteSession(hash) { await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1', [hash]); },
  };
}
