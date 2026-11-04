/**
 * Only same-site paths are accepted as a return destination. Anything else (full URLs, protocol-
 * relative "//host" paths) falls back to the home page, so the sign-in flow cannot be used to redirect
 * people to another site.
 */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\'))
    return '/';
  return value;
}
