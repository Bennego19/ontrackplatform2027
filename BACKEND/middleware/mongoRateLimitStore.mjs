import { createHmac } from 'node:crypto';
import db from '../db/conn.mjs';

// Shared fixed-window counters; the stored key does not expose the client IP.
export class MongoRateLimitStore {
  constructor(prefix) { this.prefix = prefix; }
  init(options) { this.windowMs = options.windowMs; }
  key(client) {
    const secret = process.env.JWT_SECRET || 'ontrack-connect-jwt-secret-key-2024';
    return `${this.prefix}:${createHmac('sha256', secret).update(client).digest('hex')}`;
  }
  async increment(client) {
    try {
      return await this.incrementCounter(client);
    } catch {
      const error = new Error('Rate limiting is temporarily unavailable');
      error.status = 503;
      throw error;
    }
  }
  async incrementCounter(client) {
    const collection = (await db()).collection('rate_limits');
    const expired = { $lte: [{ $ifNull: ['$resetTime', new Date(0)] }, '$$NOW'] };
    const update = [{ $set: {
      totalHits: { $cond: [expired, 1, { $add: [{ $ifNull: ['$totalHits', 0] }, 1] }] },
      resetTime: { $cond: [expired, { $add: ['$$NOW', this.windowMs] }, '$resetTime'] }
    } }];
    let result;
    try {
      result = await collection.findOneAndUpdate({ _id: this.key(client) }, update, { upsert: true, returnDocument: 'after' });
    } catch (error) {
      if (error.code !== 11000) throw error;
      result = await collection.findOneAndUpdate({ _id: this.key(client) }, update, { returnDocument: 'after' });
    }
    return { totalHits: result.totalHits, resetTime: result.resetTime };
  }
  async decrement(client) {
    await (await db()).collection('rate_limits').updateOne(
      { _id: this.key(client), $expr: { $gt: ['$resetTime', '$$NOW'] }, totalHits: { $gt: 0 } },
      { $inc: { totalHits: -1 } }
    );
  }
  async resetKey(client) {
    await (await db()).collection('rate_limits').deleteOne({ _id: this.key(client) });
  }
}
