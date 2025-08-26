// Emergency Fallback Verification
// Run in browser console on CourtBoard.html?view=mobile

console.log('=== EMERGENCY FALLBACK VERIFICATION ===');

// Basic truth checks
console.log('IS_MOBILE_VIEW:', window.IS_MOBILE_VIEW);
console.log('Bus?', !!window.MobileModal);

// Check fallback bar exists and is visible
const fallbackBar = document.getElementById('mobile-bottom-bar-fallback');
console.log('Fallback bar found:', !!fallbackBar);
console.log('Fallback bar hidden:', fallbackBar?.hidden);
console.log('Fallback bar classes:', fallbackBar?.className);

// Check what's at the bottom of screen
const bottomElement = document.elementFromPoint(innerWidth/2, innerHeight-5);
console.log('Element at bottom:', bottomElement);
console.log('Is bottom element a button?', bottomElement?.tagName === 'BUTTON');
console.log('Button data-action:', bottomElement?.getAttribute('data-action'));

// Check all buttons exist and have labels
const buttons = [...document.querySelectorAll('.mbb-fallback button')];
console.log(`Found ${buttons.length} fallback buttons:`);
buttons.forEach((btn, i) => {
  const action = btn.getAttribute('data-action');
  const label = btn.querySelector('.lbl')?.textContent;
  const disabled = btn.disabled;
  console.log(`  ${i + 1}. [${action}] "${label}" (disabled: ${disabled})`);
});

// Test modal bus directly
console.log('Testing modal bus directly...');
if (window.MobileModal) {
  console.log('Bus methods:', Object.keys(window.MobileModal));
  
  // Test with listener
  document.addEventListener('mm:open', (e) => {
    console.log('✅ Modal bus direct test successful:', e.detail);
  }, { once: true });
  
  window.MobileModal.open('court-conditions');
} else {
  console.error('❌ Modal bus not found');
}

console.log('=== MANUAL TESTS ===');
console.log('1. You should see 4 buttons at bottom with emoji + text labels');
console.log('2. Tap each button - modals should open');
console.log('3. No "Modal temporarily unavailable" text anywhere');
console.log('4. No green debug banner');

// Quick button test helpers
window.testFallback = {
  clickConditions: () => buttons[0]?.click(),
  clickReserved: () => buttons[1]?.click(),
  clickWaitlist: () => buttons[2]?.click(),
  clickJoin: () => buttons[3]?.click(),
  
  getAllStyles: () => {
    const bar = document.querySelector('.mbb-fallback');
    if (!bar) return 'No fallback bar found';
    const styles = getComputedStyle(bar);
    return {
      display: styles.display,
      position: styles.position,
      zIndex: styles.zIndex,
      bottom: styles.bottom,
      pointerEvents: styles.pointerEvents
    };
  }
};

console.log('Test helpers: window.testFallback.*');