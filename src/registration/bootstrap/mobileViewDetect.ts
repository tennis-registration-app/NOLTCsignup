/**
 * Detects ?view=mobile query parameter and applies variant-mobile class.
 * Must run before React to ensure correct initial styling.
 *
 * Extracted from inline <script> in registration/index.html.
 */
export function applyMobileViewClassFromQueryParam() {
  window.IS_MOBILE_VIEW = new URLSearchParams(location.search).get('view') === 'mobile';
  document.documentElement.classList.toggle('variant-mobile', window.IS_MOBILE_VIEW);
}
