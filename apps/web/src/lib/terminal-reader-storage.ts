const PREFIX = 'tms-terminal-reader';

export function terminalReaderStorageKey(tenantId: string): string {
  return `${PREFIX}:${tenantId}`;
}

export function readTerminalReaderPreference(tenantId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(terminalReaderStorageKey(tenantId));
  } catch {
    return null;
  }
}

export function writeTerminalReaderPreference(tenantId: string, readerId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(terminalReaderStorageKey(tenantId), readerId);
  } catch {
    /* ignore quota / private mode */
  }
}
