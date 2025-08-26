// Simple modal test
// Run this in CourtBoard.html?view=mobile console

console.log('=== SIMPLE MODAL TEST ===');

console.log('MobileModal exists:', !!window.MobileModal);
console.log('IS_MOBILE_VIEW:', window.IS_MOBILE_VIEW);

if (window.MobileModal) {
  console.log('Testing reserved modal...');
  window.MobileModal.open('reserved');
  
  setTimeout(() => {
    const modalRoot = document.getElementById('mobile-modal-root');
    console.log('Modal open:', modalRoot?.classList.contains('modal-open'));
    
    if (modalRoot?.classList.contains('modal-open')) {
      console.log('✅ Modal opened successfully');
      window.MobileModal.close();
    } else {
      console.log('❌ Modal failed to open');
    }
  }, 500);
}

console.log('=== END TEST ===');