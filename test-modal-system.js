// Test Modal System
// Run this in the browser console on CourtBoard.html?view=mobile

console.log('=== MODAL SYSTEM TEST ===');

// 1. Test modal bus exists
console.log('Modal bus exists?', !!window.MobileModal);

// 2. Test direct modal open
console.log('Testing direct modal open...');
window.MobileModal.open('court-conditions');

// 3. Add temporary listener to verify events
document.addEventListener('mm:open', (e) => {
  console.log('✅ Modal event received:', e.detail);
}, { once: true });

// 4. Check if modal root has the open class
setTimeout(() => {
  const modalRoot = document.getElementById('mobile-modal-root');
  console.log('Modal root has .modal-open class?', modalRoot?.classList.contains('modal-open'));
  
  // Check if any modal content is visible
  const modalContent = document.querySelector('.mobile-modal-overlay');
  console.log('Modal overlay visible?', !!modalContent);
  
  if (modalContent) {
    console.log('Modal overlay display:', getComputedStyle(modalContent).display);
    console.log('Modal overlay opacity:', getComputedStyle(modalContent).opacity);
  }
}, 500);

// 5. Test each button programmatically
console.log('\n=== BUTTON TESTS ===');
const buttons = document.querySelectorAll('.mbb-fallback button');
buttons.forEach((btn, i) => {
  const action = btn.getAttribute('data-action');
  console.log(`Button ${i+1}: ${action} - Click to test`);
});

// Helper to test specific modals
window.testModals = {
  conditions: () => {
    console.log('Opening Court Conditions...');
    window.MobileModal.open('court-conditions');
  },
  reserved: () => {
    console.log('Opening Reserved Courts...');
    window.MobileModal.open('reserved', { reservedData: [] });
  },
  waitlist: () => {
    console.log('Opening Waitlist...');
    window.MobileModal.open('waitlist', { 
      waitingGroups: [], 
      courts: [], 
      currentTime: new Date() 
    });
  },
  join: () => {
    console.log('Opening Join Waitlist...');
    window.MobileModal.open('join-waitlist');
  },
  close: () => {
    console.log('Closing modal...');
    window.MobileModal.close();
  }
};

console.log('\nUse window.testModals.* to test each modal type');
console.log('Example: window.testModals.conditions()');