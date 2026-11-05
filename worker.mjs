import { randomBytes, createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { httpServerHandler } from 'cloudflare:node';
import { DurableObject } from 'cloudflare:workers';
import { passwordHash } from './accounts.mjs';
import { createPortfolioServer } from './portfolio-server.mjs';

export class PortfolioAuth extends DurableObject {
 constructor(ctx, env) {
  super(ctx, env);
  this.storage = ctx.storage;
  this.sql = ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS auth (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires INTEGER NOT NULL)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY, revision TEXT NOT NULL, summary TEXT)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS record_chunks (key TEXT NOT NULL, part INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY (key, part))');
  this.sql.exec('CREATE TABLE IF NOT EXISTS background_usage (user_id TEXT PRIMARY KEY, used INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS background_reservations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL)');
 }
 reserveBackgroundRemoval(userId, limit = 2) {
  return this.storage.transactionSync(() => {
   const now = Date.now();
   this.sql.exec('DELETE FROM background_reservations WHERE expires <= ?', now);
   const row = this.sql.exec('SELECT used FROM background_usage WHERE user_id = ?', userId).toArray()[0];
   const pending = this.sql.exec('SELECT COUNT(*) AS count FROM background_reservations WHERE user_id = ?', userId).toArray()[0]?.count || 0;
   const used = row?.used || 0;
   if (used + pending >= limit) return { allowed: false, used, remaining: 0, limit };
   const reservation = randomBytes(16).toString('hex');
   this.sql.exec('INSERT INTO background_reservations (id, user_id, expires) VALUES (?, ?, ?)', reservation, userId, now + 180000);
   return { allowed: true, id: reservation, used, remaining: Math.max(0, limit - used - pending - 1), limit };
  });
 }
 commitBackgroundRemoval(userId, reservation, limit = 2) {
  return this.storage.transactionSync(() => {
   const now = Date.now();
   this.sql.exec('DELETE FROM background_reservations WHERE expires <= ?', now);
   const row = this.sql.exec('SELECT id FROM background_reservations WHERE id = ? AND user_id = ?', reservation, userId).toArray()[0];
   if (!row) return null;
   this.sql.exec('DELETE FROM background_reservations WHERE id = ?', reservation);
   this.sql.exec('INSERT OR IGNORE INTO background_usage (user_id, used, updated_at) VALUES (?, 0, ?)', userId, now);
   this.sql.exec('UPDATE background_usage SET used = used + 1, updated_at = ? WHERE user_id = ?', now, userId);
   const used = this.sql.exec('SELECT used FROM background_usage WHERE user_id = ?', userId).toArray()[0]?.used || 0;
   return { used, remaining: Math.max(0, limit - used), limit };
  });
 }
 releaseBackgroundRemoval(userId, reservation) {
  this.sql.exec('DELETE FROM background_reservations WHERE id = ? AND user_id = ?', reservation, userId);
 }
 getBackgroundQuota(userId, limit = 2) {
  const now = Date.now();
  this.sql.exec('DELETE FROM background_reservations WHERE expires <= ?', now);
  const used = this.sql.exec('SELECT used FROM background_usage WHERE user_id = ?', userId).toArray()[0]?.used || 0;
  const pending = this.sql.exec('SELECT COUNT(*) AS count FROM background_reservations WHERE user_id = ?', userId).toArray()[0]?.count || 0;
  return { used, pending, remaining: Math.max(0, limit - used - pending), limit };
 }
 async hashPassword(password, salt) {
  return new Uint8Array(await passwordHash(password, salt));
 }
 allowAttempt(key) {
  const count = (this.get(key)?.count || 0) + 1;
  if (count > 20) return false;
  this.put(key, { count, expires: Date.now() + 300000 });
  return true;
 }
 readRecord(key) {
  const row = this.sql.exec('SELECT revision, summary FROM records WHERE key = ?', key).toArray()[0];
  if (!row) return null;
  const parts = this.sql.exec('SELECT value FROM record_chunks WHERE key = ? ORDER BY part', key).toArray();
  return { revision: row.revision, summary: JSON.parse(row.summary), value: JSON.parse(parts.map(part => part.value).join('')) };
 }
 writeRecord(key, value, expected, summary) {
  return this.storage.transactionSync(() => {
   const row = this.sql.exec('SELECT revision FROM records WHERE key = ?', key).toArray()[0];
   if ((row?.revision ?? null) !== expected) return null;
   const revision = randomBytes(16).toString('hex');
   const payload = JSON.stringify(value);
   this.sql.exec('INSERT OR REPLACE INTO records VALUES (?, ?, ?)', key, revision, JSON.stringify(summary));
   this.sql.exec('DELETE FROM record_chunks WHERE key = ?', key);
   const parts = Array.from(payload.matchAll(/[\s\S]{1,400000}/gu), match => match[0]);
   parts.forEach((part, i) => this.sql.exec('INSERT INTO record_chunks VALUES (?, ?, ?)', key, i, part));
   return revision;
  });
 }
 listRecords(prefix) {
  return this.sql.exec('SELECT summary FROM records WHERE key >= ? AND key < ? AND summary != ?', prefix, prefix + '~', 'null').toArray().map(row => JSON.parse(row.summary));
 }
 get(key) {
  const row = this.sql.exec('SELECT value FROM auth WHERE key = ? AND expires > ?', key, Date.now()).toArray()[0];
  return row ? JSON.parse(row.value) : null;
 }
 put(key, value) {
  this.sql.exec('DELETE FROM auth WHERE expires <= ?', Date.now());
  this.sql.exec('INSERT OR REPLACE INTO auth VALUES (?, ?, ?)', key, JSON.stringify(value), value.expires);
 }
 remove(key) {
  this.sql.exec('DELETE FROM auth WHERE key = ?', key);
 }
 take(key) {
  const value = this.get(key);
  this.remove(key);
  return value;
 }
}

const port = 8080;
let handler;
export default {
 fetch(request, env, ctx) {
  if (!handler) {
   const origin = env.APP_ORIGIN || new URL(request.url).origin;
   const auth = () => env.PORTFOLIO_AUTH.get(env.PORTFOLIO_AUTH.idFromName('auth'));
   const recordStore = key => env.PORTFOLIO_AUTH.get(env.PORTFOLIO_AUTH.idFromName(key.split(':').slice(0, 2).join(':')));
   const backgroundStore = userId => env.PORTFOLIO_AUTH.get(env.PORTFOLIO_AUTH.idFromName('background:' + createHash('sha256').update(userId).digest('hex')));
   const server = createPortfolioServer({
    records: {
     hashPassword: (password, salt) => recordStore('password:' + salt).hashPassword(password, salt),
     read: key => recordStore(key).readRecord(key),
     write: (key, value, revision, summary = null) => recordStore(key).writeRecord(key, value, revision, summary),
     list: prefix => recordStore(prefix).listRecords(prefix),
      reserveBackgroundRemoval: (userId, limit) => backgroundStore(userId).reserveBackgroundRemoval('quota', limit),
      commitBackgroundRemoval: (userId, reservation, limit) => backgroundStore(userId).commitBackgroundRemoval('quota', reservation, limit),
      releaseBackgroundRemoval: (userId, reservation) => backgroundStore(userId).releaseBackgroundRemoval('quota', reservation),
      getBackgroundQuota: (userId, limit) => backgroundStore(userId).getBackgroundQuota('quota', limit)
    },
    env, origin,
    authStore: {
     allowAttempt: key => recordStore(key).allowAttempt(key),
     get: key => auth().get(key),
     put: (key, value) => auth().put(key, value),
     remove: key => auth().remove(key),
     take: key => auth().take(key)
    },
    async loadAsset(file) {
     const response = await env.ASSETS.fetch(new URL('/' + file, origin));
     if (!response.ok) throw Error('فایل برنامه در دسترس نیست.');
     return Buffer.from(await response.arrayBuffer());
    }
   });
   server.listen(port);
   handler = httpServerHandler({port});
  }
  return handler.fetch(request, env, ctx);
 }
};
