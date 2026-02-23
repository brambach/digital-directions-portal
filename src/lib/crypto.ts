/**
 * Credential Encryption Utilities
 * Uses AES-256-GCM for secure encryption of credentials
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY; // Must be 32 bytes (64 hex chars)
const ALGORITHM = 'aes-256-gcm';

/** Workato credentials structure */
export interface WorkatoCredentials {
  apiToken: string;
  email: string;
}

/** HiBob API credentials */
export interface HiBobCredentials {
  serviceUserId: string;
  serviceUserToken: string;
}

/** KeyPay (Employment Hero) API credentials */
export interface KeyPayCredentials {
  apiKey: string;
  businessId: string;
}

/**
 * Encrypts any JSON-serializable data using AES-256-GCM
 * Returns format: iv:authTag:encrypted
 */
export function encryptJSON<T>(data: T): string {
  if (!ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error("CREDENTIALS_ENCRYPTION_KEY is required in production");
    }
    console.warn("[crypto] CREDENTIALS_ENCRYPTION_KEY not set - storing in plaintext (dev only)");
    return JSON.stringify(data);
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts data encrypted with encryptJSON
 * @returns Decrypted data or null if decryption fails
 */
export function decryptJSON<T>(encryptedData: string): T | null {
  if (!ENCRYPTION_KEY) {
    try {
      return JSON.parse(encryptedData) as T;
    } catch {
      console.error("[crypto] Failed to parse data as JSON");
      return null;
    }
  }

  if (!encryptedData.includes(':')) {
    try {
      return JSON.parse(encryptedData) as T;
    } catch {
      console.error("[crypto] Failed to parse data as JSON");
      return null;
    }
  }

  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(ivHex, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error("[crypto] Decryption error:", error);
    return null;
  }
}

/**
 * Encrypts Workato credentials (backward-compatible wrapper)
 */
export function encryptCredentials(credentials: WorkatoCredentials): string {
  return encryptJSON(credentials);
}

/**
 * Decrypts Workato credentials (backward-compatible wrapper)
 */
export function decryptCredentials(encryptedData: string): WorkatoCredentials | null {
  return decryptJSON<WorkatoCredentials>(encryptedData);
}

/**
 * Generate a new encryption key (for initial setup)
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
