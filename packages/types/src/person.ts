/** Derive 1–2 letter initials from a display name */
export function getPersonInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

/** Stable hue (0–360) from a name for fallback avatar backgrounds */
export function getPersonHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/** Avatar image URL — uses stored photo or a deterministic generated portrait */
export function getPersonAvatarUrl(name: string, photoUrl?: string): string {
  if (photoUrl?.trim()) return photoUrl.trim();
  const seed = encodeURIComponent(name.trim() || 'member');
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
