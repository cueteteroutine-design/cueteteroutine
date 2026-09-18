import { createHash, createHmac, timingSafeEqual, randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fail } from './store.mjs';

const DEFAULT_AUTH_SECRET = 'cuet-ete-routine-default-auth-secret-2026-change-this';
const DEFAULT_ADMIN_PASSWORD = '123456';

function secret() {
  const value = process.env.AUTH_SECRET || DEFAULT_AUTH_SECRET;
  if (value.length < 32) throw fail(503, 'AUTH_SECRET must be at least 32 characters.');
  return value;
}
const key = () => createHash('sha256').update(secret()).digest();
export const hashPassword = password => {
  if (typeof password !== 'string' || password.length < 10 || password.length > 256) throw fail(400, 'Use a password between 10 and 256 characters.');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
export function verifyPassword(password, hash) {
  if (typeof password !== 'string' || password.length > 256 || !hash) return false;
  const [salt, digest] = hash.split(':');
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, 'hex');
  return expected.length === computed.length && timingSafeEqual(computed, expected);
}
export async function readAdmins(data) {
  if (data.auth) {
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(data.auth.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(data.auth.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.auth.content, 'base64')), decipher.final()]).toString());
  }
  secret();
  const users = JSON.parse(await readFile(path.resolve('data/admin-seed.json'), 'utf8'));
  const main = users.find(u => u.role === 'admin');
  if (!main) throw fail(503, 'Main admin seed is missing.');
  const bootstrapPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  if (bootstrapPassword.length < 6 || bootstrapPassword.length > 256) throw fail(503, 'ADMIN_PASSWORD must be between 6 and 256 characters for initial setup.');
  if (process.env.ADMIN_USERNAME) main.username = process.env.ADMIN_USERNAME;
  // Stable bootstrap credential fingerprint without writing during a login.
  const salt = createHmac('sha256', secret()).update('bootstrap').digest('hex');
  main.password_hash = `${salt}:${scryptSync(bootstrapPassword, salt, 64).toString('hex')}`;
  return users;
}
export function saveAdmins(data, users) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const content = Buffer.concat([cipher.update(JSON.stringify(users)), cipher.final()]);
  data.auth = { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), content: content.toString('base64') };
}
const signature = payload => createHmac('sha256', secret()).update(payload).digest('base64url');
const version = user => createHash('sha256').update(user.password_hash || '').digest('hex');
export function signSession(user) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, ver: version(user), exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export async function authenticate(req, data) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token || token.length > 2048) throw fail(401, 'Please sign in again.');
  const [payload, sig] = token.split('.');
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(sig || '');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw fail(401, 'Please sign in again.');
  let claims;
  try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw fail(401, 'Invalid session.'); }
  const users = await readAdmins(data);
  const user = users.find(u => u.id === claims.sub);
  if (!user || !user.password_hash || !(claims.exp > Date.now()) || claims.ver !== version(user)) throw fail(401, 'Session expired. Please sign in again.');
  return { user, users };
}
