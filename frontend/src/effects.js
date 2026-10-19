// Toasts are fire-and-forget so pages don't need any wiring.
export const toast = (message, type = 'success') =>
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
