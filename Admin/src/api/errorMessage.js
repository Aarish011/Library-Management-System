const TECHNICAL_MESSAGE =
  /(cast ?error|objectid|e11000|validationerror|strict mode|schema|mongoose|mongodb|mongo server|cannot read propert|undefined|null is not|enoent|econn|buffering timed out|jwt malformed|stack trace|at \w+\s*\()/i;

export function getAdminFriendlyError(
  status,
  data,
  fallback = 'Something went wrong. Please try again.'
) {
  const message =
    typeof data?.message === 'string'
      ? data.message.trim()
      : Array.isArray(data?.message)
        ? String(data.message[0] || '').trim()
        : '';

  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (status === 413) {
    return 'The selected file is too large. Choose a smaller file and try again.';
  }
  if (status === 401) {
    if (message.toLowerCase().includes('invalid credentials')) {
      return 'Invalid admin email or password.';
    }
    return 'Your admin session has expired. Please sign in again.';
  }
  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (status >= 500 || TECHNICAL_MESSAGE.test(message)) {
    return 'We could not complete this request right now. Please try again shortly.';
  }
  return message || fallback;
}
