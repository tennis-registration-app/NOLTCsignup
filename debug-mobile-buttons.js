// Truth checks for mobile modal buttons
// Run this in the browser console on CourtBoard.html?view=mobile

console.log('=== MOBILE MODAL DEBUG TRUTH CHECKS ===');

// A. Are we in mobile variant?
console.log('IS_MOBILE_VIEW =', window.IS_MOBILE_VIEW);
console.log('html.classList =', [...document.documentElement.classList]);

// B. Is the bus defined & responsive?
console.log('Bus exists?', !!window.MobileModal);
console.log('Bus methods:', window.MobileModal ? Object.keys(window.MobileModal) : 'N/A');

// Test bus open
if (window.MobileModal) {
  console.log('Testing bus open for court-conditions...');
  window.MobileModal.open('court-conditions'); // should open a modal immediately
} else {
  console.error('❌ MobileModal bus not found!');
}

// C. Is the second root mounted & listening?
console.log('Setting up event listener test...');
document.addEventListener('mm:open', e => {
  console.log('🎉 MM OPEN event received:', e.detail);
}, { once: true });

setTimeout(() => {
  console.log('Testing waitlist modal...');
  if (window.MobileModal) {
    window.MobileModal.open('waitlist', {test: true});
  }
}, 1000);

// D. Do button clicks actually fire?
console.log('Setting up button click tests...');
const buttons = [...document.querySelectorAll('.mobile-bottom-bar button')];
console.log('Found buttons:', buttons.length);

buttons.forEach((b, i) => {
  const label = b.getAttribute('aria-label') || `Button ${i}`;
  console.log(`Button ${i}: ${label}`);
  b.addEventListener('click', () => {
    console.log(`🔘 BUTTON CLICK DETECTED: ${label} (${i})`);
  }, { once: true });
});

// E. Element coverage test
setTimeout(() => {
  console.log('=== ELEMENT COVERAGE TEST ===');
  const bottomY = window.innerHeight - 5;
  const centerX = window.innerWidth / 2;
  const elementAtBottom = document.elementFromPoint(centerX, bottomY);
  console.log('Element at bottom center:', elementAtBottom);
  console.log('Element classes:', elementAtBottom?.classList.toString());
  console.log('Is it in bottom bar?', elementAtBottom?.closest('.mobile-bottom-bar') ? 'YES' : 'NO');
}, 2000);

console.log('=== DEBUG SETUP COMPLETE ===');
console.log('Try clicking the bottom bar buttons now and watch for logs...');