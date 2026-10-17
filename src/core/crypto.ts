import * as crypto from 'crypto';

function deriveKey(password: string, roomCode: string): Buffer {
  return crypto.pbkdf2Sync(password, roomCode, 100000, 32, 'sha256');
}

export function encryptSignal(payload: any, password: string, roomCode: string): string {
  const key = deriveKey(password, roomCode);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const data = JSON.stringify(payload);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  
  return JSON.stringify({ iv: iv.toString('base64'), data: encrypted, tag: authTag });
}

export function decryptSignal(cipherText: string, password: string, roomCode: string): any {
  try {
    const { iv, data, tag } = JSON.parse(cipherText);
    const key = deriveKey(password, roomCode);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    throw new Error("Decryption failed. Invalid session password or tampered payload.");
  }
}