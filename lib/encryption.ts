import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

// Validate encryption key length (should be 32 bytes for AES-256)
if (ENCRYPTION_KEY.length !== 64) { // 64 hex characters = 32 bytes
  throw new Error(`ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes), got ${ENCRYPTION_KEY.length}`);
}

// Validate that it's a valid hex string
if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  throw new Error('ENCRYPTION_KEY must be a valid 64-character hex string');
}

// At this point, ENCRYPTION_KEY is guaranteed to be a valid 64-char hex string
const ENCRYPTION_KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');

export function encrypt(text: string): string {
  if (!text) return '';
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY_BUFFER, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt text');
  }
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY_BUFFER, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

// Helper to encrypt an object with string values
export function encryptObject(obj: Record<string, any>): Record<string, string> {
  if (!obj || typeof obj !== 'object') {
    return {};
  }
  
  const encrypted: Record<string, string> = {};
  try {
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
          encrypted[key] = encrypt(value);
        } else if (typeof value === 'boolean') {
          encrypted[key] = encrypt(value.toString());
        } else if (typeof value === 'number') {
          encrypted[key] = encrypt(value.toString());
        }
      }
    }
  } catch (error) {
    console.error('Object encryption failed:', error);
    throw new Error('Failed to encrypt object');
  }
  return encrypted;
}

// Helper to decrypt an object with encrypted string values
export function decryptObject(encryptedObj: Record<string, string>): Record<string, any> {
  if (!encryptedObj || typeof encryptedObj !== 'object') {
    return {};
  }
  
  const decrypted: Record<string, any> = {};
  try {
    for (const [key, value] of Object.entries(encryptedObj)) {
      if (value) {
        const decryptedValue = decrypt(value);
        // Try to parse back to original type
        if (decryptedValue === 'true' || decryptedValue === 'false') {
          decrypted[key] = decryptedValue === 'true';
        } else if (!isNaN(Number(decryptedValue))) {
          decrypted[key] = Number(decryptedValue);
        } else {
          decrypted[key] = decryptedValue;
        }
      }
    }
  } catch (error) {
    console.error('Object decryption failed:', error);
    throw new Error('Failed to decrypt object');
  }
  return decrypted;
}
