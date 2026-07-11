const TECHNICAL_MESSAGE =
  /(cast ?error|objectid|e11000|validationerror|strict mode|schema|mongoose|mongodb|mongo server|cannot read propert|undefined|null is not|enoent|econn|buffering timed out|jwt malformed|stack trace|at \w+\s*\()/i;

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

function extractServerMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.message === 'string') return data.message.trim();
  if (Array.isArray(data?.message)) return String(data.message[0] || '').trim();
  if (Array.isArray(data?.errors) && data.errors.length) {
    return String(data.errors[0]?.msg || data.errors[0]?.message || '').trim();
  }
  return typeof error?.message === 'string' ? error.message.trim() : '';
}

export function getUserFriendlyError(
  error,
  fallback = 'Something went wrong. Please try again.'
) {
  const status = error?.response?.status || error?.status || null;
  const serverMessage = extractServerMessage(error);
  const requestUrl = error?.config?.url || '';

  if (!error?.response && (error?.isNetworkError || error?.request)) {
    return 'Unable to connect to the server. Check your connection and try again.';
  }
  if (error?.code === 'ECONNABORTED') {
    return 'The request took too long. Please try again.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (status === 413) {
    return 'The selected file is too large. Choose a smaller file and try again.';
  }
  if (
    PUBLIC_AUTH_PATHS.some((path) => requestUrl.includes(path)) &&
    serverMessage &&
    !TECHNICAL_MESSAGE.test(serverMessage)
  ) {
    return serverMessage;
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (
    status === 403 &&
    (!serverMessage || TECHNICAL_MESSAGE.test(serverMessage))
  ) {
    return 'You do not have permission to perform this action.';
  }
  if (status >= 500 || TECHNICAL_MESSAGE.test(serverMessage)) {
    return 'We could not complete your request right now. Please try again shortly.';
  }

  return serverMessage || fallback;
}
