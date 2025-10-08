/**
 * Encryption utilities for settings and sensitive data
 *
 * Uses browser-safe encryption for client-side data storage
 */

import crypto from 'crypto';

// Encryption key - in production this should come from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32chars!!';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt a string value
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Fallback to unencrypted if encryption fails
  }
}

/**
 * Decrypt a string value
 */
export function decrypt(text: string): string {
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      return text; // Not encrypted, return as-is
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return text; // Fallback to returning encrypted text if decryption fails
  }
}

/**
 * Encrypt an entire settings object
 */
export function encryptSettings<T extends Record<string, any>>(settings: T): T {
  const encrypted = {} as T;

  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'string' && value) {
      // Only encrypt non-empty strings
      encrypted[key as keyof T] = encrypt(value) as any;
    } else {
      encrypted[key as keyof T] = value;
    }
  }

  return encrypted;
}

/**
 * Decrypt an entire settings object
 */
export function decryptSettings<T extends Record<string, any>>(settings: T): T {
  const decrypted = {} as T;

  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'string' && value) {
      // Only decrypt non-empty strings
      decrypted[key as keyof T] = decrypt(value) as any;
    } else {
      decrypted[key as keyof T] = value;
    }
  }

  return decrypted;
}

/**
 * Mask an API key for display (show first 4 and last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '••••••••';
  }

  const firstFour = apiKey.substring(0, 4);
  const lastFour = apiKey.substring(apiKey.length - 4);
  const masked = '•'.repeat(Math.min(apiKey.length - 8, 20));

  return `${firstFour}${masked}${lastFour}`;
}

/**
 * Validate if a string is encrypted
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  const parts = text.split(':');
  return parts.length === 2 && /^[0-9a-f]+$/.test(parts[0]) && /^[0-9a-f]+$/.test(parts[1]);
}

/**
 * Client-safe encryption for localStorage (browser-only)
 * Uses Web Crypto API which is available in browsers
 */
export async function encryptForClient(text: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side, use Node crypto
    return encrypt(text);
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const key = await getClientKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const encryptedArray = new Uint8Array(encryptedData);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Client encryption error:', error);
    return text;
  }
}

/**
 * Client-safe decryption for localStorage (browser-only)
 */
export async function decryptForClient(encryptedText: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side, use Node crypto
    return decrypt(encryptedText);
  }

  try {
    const combined = new Uint8Array(
      atob(encryptedText)
        .split('')
        .map(c => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const key = await getClientKey();

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Client decryption error:', error);
    return encryptedText;
  }
}

/**
 * Get or create encryption key for client-side operations
 */
async function getClientKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(ENCRYPTION_KEY);
  const hash = await crypto.subtle.digest('SHA-256', keyMaterial);

  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}
