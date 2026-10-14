import test from "node:test";
import assert from "node:assert/strict";
import {
  authHandlers,
  hashPassword,
  verifyPassword,
  sameOrigin,
  authRateLimit,
} from "./auth.js";
import { memoryAuthStore } from "./auth-store.js";
function response() {
  return {
    code: 200,
    headers: {},
    cookies: {},
    status(code) {
      this.code = code;
      return this;
    },
    set(key, value) {
      this.headers[key] = value;
      return this;
    },
    cookie(key, value, options) {
      this.cookies[key] = { value, options };
      return this;
    },
    clearCookie(key) {
      this.cleared = key;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
const request = (body = {}, cookie = "") => ({ body, headers: { cookie } });
test("password hashes have unique salts and verify without plaintext storage", async () => {
  const a = await hashPassword("correct horse battery");
  const b = await hashPassword("correct horse battery");
  assert.notEqual(a, b);
  assert.ok(!a.includes("correct horse"));
  assert.equal(await verifyPassword("correct horse battery", a), true);
  assert.equal(await verifyPassword("wrong password", a), false);
});
test("signup, session restore, protected access, logout, and login form a complete flow", async () => {
  const store = memoryAuthStore();
  const auth = authHandlers(store);
  const signup = response();
  await auth.signup(
    request({
      name: " Alex ",
      email: " ALEX@example.com ",
      password: "long password 123",
    }),
    signup,
  );
  assert.equal(signup.code, 201);
  assert.equal(signup.body.user.email, "alex@example.com");
  assert.equal(signup.body.user.name, "Alex");
  assert.equal(signup.body.user.passwordHash, undefined);
  const saved = await store.findUser("alex@example.com");
  assert.notEqual(saved.passwordHash, "long password 123");
  const cookie = `meridian_session=${signup.cookies.meridian_session.value}`;
  assert.equal(signup.cookies.meridian_session.options.httpOnly, true);
  assert.equal(signup.cookies.meridian_session.options.sameSite, "lax");
  const me = response();
  await auth.me(request({}, cookie), me);
  assert.deepEqual(me.body.user, signup.body.user);
  let allowed = false;
  await auth.requireUser(request({}, cookie), response(), () => {
    allowed = true;
  });
  assert.equal(allowed, true);
  const logout = response();
  await auth.logout(request({}, cookie), logout);
  assert.equal(logout.cleared, "meridian_session");
  const denied = response();
  await auth.requireUser(request({}, cookie), denied, () =>
    assert.fail("revoked session allowed"),
  );
  assert.equal(denied.code, 401);
  const login = response();
  await auth.login(
    request({ email: "alex@example.com", password: "long password 123" }),
    login,
  );
  assert.equal(login.code, 200);
  assert.notEqual(
    login.cookies.meridian_session.value,
    signup.cookies.meridian_session.value,
  );
});
test("invalid input, duplicate signup, incorrect password, and absent account are rejected", async () => {
  const auth = authHandlers(memoryAuthStore());
  const fields = {
    name: "Alex",
    email: "alex@example.com",
    password: "long password 123",
  };
  for (const body of [
    { ...fields, email: "invalid" },
    { ...fields, password: "short" },
    { ...fields, name: "" },
    { email: [] },
  ]) {
    const res = response();
    await auth.signup(request(body), res);
    assert.equal(res.code, 400);
  }
  await auth.signup(request(fields), response());
  const duplicate = response();
  await auth.signup(
    request({ ...fields, email: "ALEX@example.com" }),
    duplicate,
  );
  assert.equal(duplicate.code, 409);
  for (const email of [fields.email, "unknown@example.com"]) {
    const res = response();
    await auth.login(request({ email, password: "wrong" }), res);
    assert.equal(res.code, 401);
    assert.equal(res.body.error, "Email or password is incorrect.");
  }
});
test("expired sessions and malformed cookies cannot access statistics", async () => {
  const store = memoryAuthStore();
  await store.createUser({ id: "1", email: "a@example.com" });
  await store.saveSession("expired", "1", new Date(Date.now() - 1));
  assert.equal(await store.sessionUser("expired"), null);
  const auth = authHandlers(store);
  for (const cookie of ["", "meridian_session=bad%cookie"]) {
    const res = response();
    await auth.requireUser(request({}, cookie), res, () => assert.fail());
    assert.equal(res.code, 401);
  }
});
test("session rotation revokes prior cookie and production cookies are secure", async () => {
  const auth = authHandlers(memoryAuthStore(), { secure: true });
  const fields = {
    name: "Alex",
    email: "alex@example.com",
    password: "long password 123",
  };
  const initial = response();
  await auth.signup(request(fields), initial);
  const cookie = `meridian_session=${initial.cookies.meridian_session.value}`;
  const login = response();
  await auth.login(request(fields, cookie), login);
  assert.equal(login.cookies.meridian_session.options.secure, true);
  const previous = response();
  await auth.me(request({}, cookie), previous);
  assert.equal(previous.body.user, null);
});
test("same-origin writes are accepted and foreign origins rejected", () => {
  const req = (origin) => ({
    get: (key) => ({ origin, host: "localhost:5173" })[key],
  });
  let allowed = false;
  sameOrigin(req("http://localhost:5173"), response(), () => {
    allowed = true;
  });
  assert.equal(allowed, true);
  for (const origin of ["https://attacker.example", "null"]) {
    const res = response();
    sameOrigin(req(origin), res, () => assert.fail());
    assert.equal(res.code, 403);
  }
});
test("authentication attempts are rate limited", () => {
  const limit = authRateLimit();
  for (let i = 0; i < 20; i++) limit({ ip: "test" }, response(), () => {});
  const res = response();
  limit({ ip: "test" }, res, () => assert.fail());
  assert.equal(res.code, 429);
  assert.ok(Number(res.headers["Retry-After"]) > 0);
});
test("storage failure produces a service error without exposing details", async () => {
  const auth = authHandlers({
    sessionUser: async () => {
      throw new Error("secret connection information");
    },
  });
  const res = response();
  await auth.me(request({}, `meridian_session=${"a".repeat(64)}`), res);
  assert.equal(res.code, 503);
  assert.ok(!res.body.error.includes("secret"));
});
