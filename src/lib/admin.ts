import { User } from 'firebase/auth';

export const AUTHORIZED_ADMIN_EMAILS = [
  'ceganigabriel@gmail.com',
  'bunnicula646@gmail.com',
];

export function isAuthorizedAdminUser(
  user?: User | null,
  hasAdminDoc = false
): boolean {
  if (!user) return false;
  if (hasAdminDoc) return true;
  const email = (user.email || '').toLowerCase().trim();
  if (!email) return false;
  // Require email to be present in allowlist (and verified if provided)
  return AUTHORIZED_ADMIN_EMAILS.includes(email) && user.emailVerified !== false;
}
