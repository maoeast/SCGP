import { encryptData, decryptData, encryptBytes, decryptBytes } from './crypto'

export const LEGACY_BACKUP_SECRET_EXPIRES_IN = 'v1-v3 backup import only'

export function encryptLegacyBackupData(data: unknown): string {
  return encryptData(data)
}

export function decryptLegacyBackupData(payload: string): unknown {
  return decryptData(payload)
}

export function encryptLegacyBackupBytes(bytes: Uint8Array): string {
  return encryptBytes(bytes)
}

export function decryptLegacyBackupBytes(payload: string): Uint8Array | null {
  return decryptBytes(payload)
}
