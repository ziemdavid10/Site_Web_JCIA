/**
 * Error pages — ENGLISH
 */
export default {
  eyebrow: 'Error',
  mascotAlt: 'The JCIA mascot, puzzled',
  retry: 'Try again',
  home: 'Back to home',
  contact: 'Contact the secretariat',
  suggestionsTitle: 'Perhaps you were looking for:',
  suggestions: [
    { id: 'programme', label: 'The programme' },
    { id: 'awards', label: 'The Cameroon AI Awards' },
    { id: 'inscription', label: 'Registration' },
    { id: 'faq', label: 'The FAQ' },
  ],
  codes: {
    400: { title: 'Bad request', text: 'The server could not understand the request. Check the address or the information entered, then try again.' },
    401: { title: 'Authentication required', text: 'This page is restricted. Please sign in to access it.' },
    403: { title: 'Access denied', text: 'You do not have permission to access this resource. If you think this is a mistake, please contact us.' },
    404: { title: 'Page not found', text: 'Even our robot couldn’t find this page. It may have been moved or no longer exists.' },
    408: { title: 'Request timeout', text: 'The connection took too long to respond. Check your network and try again.', retry: true },
    429: { title: 'Too many requests', text: 'You have made too many requests in a short time. Please wait a moment before trying again.', retry: true },
    500: { title: 'Internal error', text: 'Something unexpected went wrong on our side. Our team has been notified; please try again shortly.', retry: true },
    502: { title: 'Bad gateway', text: 'The server received an invalid response. Please try again shortly.', retry: true },
    503: { title: 'Service unavailable', text: 'The site is temporarily unavailable (maintenance or heavy traffic). Please come back a little later.', retry: true },
  },
}
