// Test script to verify the mobile modal signal chain
// Run this in the browser console on CourtBoard.html?view=mobile

console.log('=== MOBILE MODAL SIGNAL CHAIN VERIFICATION ===');

// 1. Check mobile view
console.log('1. Mobile View Check:');
console.log('  - IS_MOBILE_VIEW:', window.IS_MOBILE_VIEW);
console.log('  - Variant class:', document.documentElement.classList.contains('variant-mobile'));

// 2. Check event bus
console.log('\n2. Event Bus Check:');
console.log('  - window.MobileModal exists:', !!window.MobileModal);
console.log('  - Has open method:', typeof window.MobileModal?.open === 'function');
console.log('  - Has close method:', typeof window.MobileModal?.close === 'function');

// 3. Check DOM elements
console.log('\n3. DOM Elements Check:');
console.log('  - Modal root exists:', !!document.getElementById('mobile-modal-root'));
console.log('  - Bottom bar fallback exists:', !!document.getElementById('mobile-bottom-bar-fallback'));
console.log('  - Bottom bar buttons:', document.querySelectorAll('#mobile-bottom-bar-fallback button').length);

// 4. Test event listeners
console.log('\n4. Testing Event Listeners:');
let openEventReceived = false;
let closeEventReceived = false;

document.addEventListener('mm:open', (e) => {
  openEventReceived = true;
  console.log('  ✅ mm:open event received:', e.detail);
}, { once: true });

document.addEventListener('mm:close', () => {
  closeEventReceived = true;
  console.log('  ✅ mm:close event received');
}, { once: true });

// 5. Test opening a modal
console.log('\n5. Testing Modal Open:');
console.log('  - Calling window.MobileModal.open("test", {data: "test payload"})');
window.MobileModal.open('test', {data: 'test payload'});

setTimeout(() => {
  console.log('  - Event received:', openEventReceived ? '✅ Yes' : '❌ No');
  console.log('  - Modal root has .modal-open class:', 
    document.getElementById('mobile-modal-root')?.classList.contains('modal-open') ? '✅ Yes' : '❌ No');
  
  // 6. Test closing
  console.log('\n6. Testing Modal Close:');
  console.log('  - Calling window.MobileModal.close()');
  window.MobileModal.close();
  
  setTimeout(() => {
    console.log('  - Event received:', closeEventReceived ? '✅ Yes' : '❌ No');
    console.log('  - Modal root .modal-open removed:', 
      !document.getElementById('mobile-modal-root')?.classList.contains('modal-open') ? '✅ Yes' : '❌ No');
    
    // 7. Test button click with payload
    console.log('\n7. Testing Button Click with Payload:');
    const reservedBtn = document.querySelector('button[data-action="reserved"]');
    if (reservedBtn) {
      console.log('  - Simulating click on Reserved button...');
      
      // Listen for the next open event
      document.addEventListener('mm:open', (e) => {
        console.log('  ✅ Button click triggered mm:open');
        console.log('  - Type:', e.detail.type);
        console.log('  - Payload:', e.detail.payload);
        console.log('  - Has reservedData:', !!e.detail.payload?.reservedData);
      }, { once: true });
      
      reservedBtn.click();
    } else {
      console.log('  ❌ Reserved button not found');
    }
    
    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log('Check the console output above for any ❌ marks indicating issues.');
  }, 100);
}, 100);