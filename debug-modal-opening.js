// Debug script for modal opening issue
// Run this in CourtBoard.html?view=mobile console

console.log('=== MODAL OPENING DEBUG ===');

// 1. Check basic setup
console.log('\n1. Basic checks:');
console.log('  - IS_MOBILE_VIEW:', window.IS_MOBILE_VIEW);
console.log('  - React available:', !!window.React);
console.log('  - ReactDOM available:', !!window.ReactDOM);
console.log('  - MobileModal exists:', !!window.MobileModal);

if (window.MobileModal) {
  console.log('  - MobileModal.open exists:', typeof window.MobileModal.open);
  console.log('  - MobileModal.close exists:', typeof window.MobileModal.close);
}

// 2. Check DOM elements
console.log('\n2. DOM elements:');
const modalRoot = document.getElementById('mobile-modal-root');
const bottomBar = document.getElementById('mobile-bottom-bar-root');

console.log('  - mobile-modal-root exists:', !!modalRoot);
console.log('  - mobile-modal-root innerHTML length:', modalRoot?.innerHTML?.length || 0);
console.log('  - mobile-bottom-bar-root exists:', !!bottomBar);

// 3. Check event listeners
console.log('\n3. Testing event system:');

let openEventCount = 0;
let closeEventCount = 0;

const openListener = (e) => {
  openEventCount++;
  console.log(`  - mm:open event #${openEventCount}:`, e.detail);
};

const closeListener = (e) => {
  closeEventCount++;
  console.log(`  - mm:close event #${closeEventCount}`);
};

document.addEventListener('mm:open', openListener);
document.addEventListener('mm:close', closeListener);

// 4. Test opening a modal
console.log('\n4. Testing modal opening:');
if (window.MobileModal) {
  console.log('  - Calling MobileModal.open("reserved")...');
  
  try {
    window.MobileModal.open('reserved');
    console.log('  - MobileModal.open() call completed without error');
    
    setTimeout(() => {
      console.log('\n5. Results after 1 second:');
      console.log('  - Open events received:', openEventCount);
      console.log('  - Close events received:', closeEventCount);
      console.log('  - Modal root has modal-open class:', modalRoot?.classList.contains('modal-open'));
      console.log('  - Modal root innerHTML length:', modalRoot?.innerHTML?.length || 0);
      
      // Check if any modal content is visible
      const modalOverlay = document.querySelector('.mobile-modal-overlay');
      const modalContent = document.querySelector('.mobile-modal-content');
      
      console.log('  - Modal overlay exists:', !!modalOverlay);
      console.log('  - Modal content exists:', !!modalContent);
      
      if (modalContent) {
        console.log('  - Modal content visible:', getComputedStyle(modalContent).display !== 'none');
        console.log('  - Modal content sample:', modalContent.innerHTML.substring(0, 100) + '...');
      }
      
      // Cleanup
      document.removeEventListener('mm:open', openListener);
      document.removeEventListener('mm:close', closeListener);
      
      // Try to close if open
      if (modalRoot?.classList.contains('modal-open')) {
        console.log('\n6. Attempting to close modal...');
        window.MobileModal.close();
      }
      
    }, 1000);
    
  } catch (e) {
    console.error('  - Error calling MobileModal.open():', e);
  }
  
} else {
  console.error('  - MobileModal not available');
}

console.log('\n=== END MODAL OPENING DEBUG ===');