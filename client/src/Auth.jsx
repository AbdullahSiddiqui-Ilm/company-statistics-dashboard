import React, { useEffect, useState } from 'react';
import { ChartNoAxesCombined, ArrowRight } from 'lucide-react';
import { fetchStatistics } from './api.js';
export function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setChecking(true); setError('');
    fetchStatistics('/api/auth/me', { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setUser(data.user); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [retry]);
  if (checking) return <div className="auth-loading" role="status">Checking your session…</div>;
  if (error) return <div className="auth-loading" role="alert"><p>{error}</p><button className="button" onClick={() => setRetry(v => v + 1)}>Try again</button></div>;
  if (!user) return <AuthForm onAuthenticated={setUser}/>;
  return children(user, () => setUser(null));
}
function AuthForm({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const signup = mode === 'signup';
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (signup && fields.password !== fields.confirmPassword) { setError('Passwords do not match.'); return; }
    delete fields.confirmPassword;
    setPending(true); setError('');
    try {
      const data = await fetchStatistics(`/api/auth/${mode}`, { method: 'POST', body: fields });
      onAuthenticated(data.user);
    } catch (err) { setError(err.message); }
    finally { setPending(false); }
  }
  return <main className="auth-layout"><section className="auth-story"><a className="brand" href="#"><span className="brand-icon"><ChartNoAxesCombined size={22}/></span>meridian<span className="brand-period">.</span></a><div><p className="eyebrow">YOUR BUSINESS, AT A GLANCE</p><h1>Good decisions start<br/>with a clearer picture<span>.</span></h1><p>Bring your company’s numbers together. Explore performance, understand trends, and see what comes next.</p><div className="auth-illustration" aria-hidden="true">{[36,58,44,75,61,90,100].map((height,i) => <span key={i} style={{ height:`${height}%` }}/>)}</div></div><p className="auth-footnote">Company insights. One place.</p></section><section className="auth-form-section"><div className="auth-card"><p className="eyebrow">MERIDIAN WORKSPACE</p><h2>{signup ? 'Create your account' : 'Welcome back'}</h2><p>{signup ? 'Get started with your company dashboard.' : 'Log in to view your company statistics.'}</p><form onSubmit={submit} key={mode}><fieldset disabled={pending}>
    {signup && <label>Full name<input name="name" autoComplete="name" required maxLength={80} placeholder="Alex Morgan"/></label>}
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@company.com"/></label>
    <label>Password<input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 10 : 1} maxLength={128} aria-describedby={signup ? 'password-help' : undefined}/></label>
    {signup && <><p id="password-help" className="password-help">Use at least 10 characters.</p><label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128}/></label></>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <button className="auth-submit" type="submit">{pending ? 'Please wait…' : signup ? 'Create account' : 'Log in'}{!pending && <ArrowRight size={17}/>}</button>
  </fieldset></form><p className="auth-switch">{signup ? 'Already have an account?' : 'New to Meridian?'} <button disabled={pending} onClick={() => { setMode(signup ? 'login' : 'signup'); setError(''); }}>{signup ? 'Log in' : 'Sign up'}</button></p><p className="auth-disclosure">All accounts access this company’s dashboard. In sample-data mode, accounts reset when the server restarts.</p></div></section></main>;
}
