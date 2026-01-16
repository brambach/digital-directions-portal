/**
 * Credential Encryption Utilities
 * Uses AES-256-GCM for secure encryption of Workato credentials
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY; // Must be 32 bytes (64 hex chars)
const ALGORITHM = 'aes-256-gcm';

/** Workato credentials structure */
export interface WorkatoCredentials {
  apiToken: string;
  email: string;
}

/**
 * Encrypts credentials using AES-256-GCM
 * Returns format: iv:authTag:encrypted
 *
 * @throws Error in production if CREDENTIALS_ENCRYPTION_KEY is not set
 */
export function encryptCredentials(credentials: WorkatoCredentials): string {
  if (!ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error("CREDENTIALS_ENCRYPTION_KEY is required in production");
    }
    console.warn("[crypto] CREDENTIALS_ENCRYPTION_KEY not set - storing credentials in plaintext (dev only)");
    return JSON.stringify(credentials);
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts credentials encrypted with encryptCredentials
 * @returns Decrypted credentials or null if decryption fails
 */
export function decryptCredentials(encryptedData: string): WorkatoCredentials | null {
  if (!ENCRYPTION_KEY) {
    // If no encryption key, assume it's plaintext JSON (dev mode only)
    try {
      return JSON.parse(encryptedData) as WorkatoCredentials;
    } catch {
      console.error("[crypto] Failed to parse credentials as JSON");
      return null;
    }
  }

  // Check if data is in encrypted format (has colons for iv:authTag:encrypted)
  if (!encryptedData.includes(':')) {
    // Assume it's plaintext JSON (legacy data)
    try {
      return JSON.parse(encryptedData) as WorkatoCredentials;
    } catch {
      console.error("[crypto] Failed to parse credentials as JSON");
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

    return JSON.parse(decrypted) as WorkatoCredentials;
  } catch (error) {
    console.error("[crypto] Decryption error:", error);
    return null;
  }
}

/**
 * Generate a new encryption key (for initial setup)
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
