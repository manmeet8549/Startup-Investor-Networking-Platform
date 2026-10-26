import crypto from 'node:crypto';
import { inMemoryDb, query } from '../db/index.js';
import type { Notification } from '../db/schema.types.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export interface NotifyOptions {
  title?: string;
  message?: string;
  link?: string | null;
}

/**
 * Creates and stores a notification for a user.
 * Called on document access requests, approvals, declines, etc.
 */
export async function notify(
  userId: string,
  type: string,
  payload: Record<string, unknown> = {},
  options?: NotifyOptions | string,
  maybeMessage?: string
): Promise<Notification> {
  // Support both notify(userId, type, payload, { title, message }) and notify(userId, type, payload, title, message)
  let title = 'Notification';
  let message = 'You have a new notification';
  let link: string | null = null;

  if (typeof options === 'string') {
    title = options;
    if (typeof maybeMessage === 'string') {
      message = maybeMessage;
    }
  } else if (options && typeof options === 'object') {
    if (options.title) title = options.title;
    if (options.message) message = options.message;
    if (options.link !== undefined) link = options.link;
  }

  const notification: Notification = {
    id: crypto.randomUUID(),
    user_id: userId,
    title,
    message,
    type,
    payload,
    link,
    read: false,
    created_at: new Date().toISOString(),
  };

  logger.info(
    { userId, type, notificationId: notification.id, title },
    'Creating user notification'
  );

  if (config.DATABASE_URL && config.NODE_ENV !== 'test') {
    try {
      const res = await query<Notification>(
        `INSERT INTO public.notifications (id, user_id, title, message, type, payload, link, read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          notification.id,
          notification.user_id,
          notification.title,
          notification.message,
          notification.type,
          JSON.stringify(notification.payload),
          notification.link,
          notification.read,
          notification.created_at,
        ]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err) {
      logger.error({ err, userId }, 'Failed to persist notification to PostgreSQL, saving to in-memory store');
    }
  }

  // Save to inMemoryDb
  inMemoryDb.notifications.set(notification.id, notification);
  return notification;
}
