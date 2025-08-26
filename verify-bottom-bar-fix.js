// Bottom Bar Fix Verification Script
// Run in browser console on CourtBoard.html?view=mobile

console.log('=== BOTTOM BAR FIX VERIFICATION ===');

// 1) One-shot truth snapshot
console.log('IS_MOBILE_VIEW:', window.IS_MOBILE_VIEW);
console.log('Bus?', !!window.MobileModal);
console.log('Bar node?', !!document.querySelector('.mobile-bottom-bar'));
console.log('Top-at-bottom?', document.elementFromPoint(innerWidth/2, innerHeight-5));

// 2) Element coverage test
const bottomElement = document.elementFromPoint(innerWidth/2, innerHeight-5);
const isBarElement = bottomElement?.closest('.mobile-bottom-bar') || 
                     bottomElement?.classList?.contains('mobile-bottom-button');
console.log('Element at bottom is bar/button?', !!isBarElement);

// 3) Z-index verification
const barElement = document.querySelector('.mobile-bottom-bar');
if (barElement) {
  const computedStyle = getComputedStyle(barElement);
  console.log('Bottom bar z-index:', computedStyle.zIndex);
  console.log('Bottom bar position:', computedStyle.position);
  console.log('Bottom bar pointer-events:', computedStyle.pointerEvents);
}

// 4) Modal bus test
console.log('Testing modal bus...');
if (window.MobileModal) {
  console.log('Bus methods:', Object.keys(window.MobileModal));
  
  // Set up listener for test
  document.addEventListener('mm:open', (e) => {
    console.log('✅ Modal bus test successful:', e.detail);
  }, { once: true });
  
  // Test open
  window.MobileModal.open('test', { test: true });
} else {
  console.error('❌ Modal bus not found');
}

// 5) Button click path test
console.log('Setting up click path test...');
document.addEventListener('click', (e) => {
  console.log('CLICK PATH:', e.composedPath().slice(0, 5).map(el => ({
    tag: el.tagName,
    class: el.className,
    id: el.id
  })));
}, { capture: true, once: true });

// 6) Button existence and handlers
const buttons = [...document.querySelectorAll('.mobile-bottom-bar button')];
console.log(`Found ${buttons.length} bottom bar buttons:`);
buttons.forEach((btn, i) => {
  const label = btn.getAttribute('aria-label') || `Button ${i}`;
  const isDisabled = btn.disabled;
  console.log(`  ${i + 1}. ${label} (disabled: ${isDisabled})`);
});

// 7) Test each button
buttons.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    console.log(`🎯 Button ${i + 1} click detected successfully!`);
  }, { once: true });
});

console.log('=== VERIFICATION COMPLETE ===');
console.log('Try clicking each bottom bar button and watch for success messages...');
console.log('Expected: 4 buttons, all clickable, bus opens modals immediately');

// Test shortcuts
window.testBar = {
  clickConditions: () => buttons[0]?.click(),
  clickReserved: () => buttons[1]?.click(),
  clickWaitlist: () => buttons[2]?.click(),
  clickJoin: () => buttons[3]?.click(),
  
  testBus: () => {
    if (window.MobileModal) {
      console.log('Testing direct bus call...');
      window.MobileModal.open('court-conditions');
      return '✅ Bus call attempted';
    }
    return '❌ Bus not available';
  },
  
  elementAtBottom: () => {
    const el = document.elementFromPoint(innerWidth/2, innerHeight-5);
    return {
      element: el,
      isButton: el?.tagName === 'BUTTON',
      isInBar: !!el?.closest('.mobile-bottom-bar'),
      classes: el?.className
    };
  }
};

console.log('Test shortcuts available as window.testBar.*');