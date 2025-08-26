// Test all modal types to isolate the issue
// Run this in CourtBoard.html?view=mobile console

console.log('=== TEST ALL MODAL TYPES ===');

const modalTypes = ['court-conditions', 'reserved', 'waitlist'];
let currentTestIndex = 0;

function testModal(type) {
  console.log(`\n--- Testing ${type} modal ---`);
  
  if (!window.MobileModal) {
    console.error('MobileModal not available');
    return;
  }
  
  // Open the modal
  window.MobileModal.open(type, type === 'reserved' ? { reservedData: [] } : type === 'waitlist' ? { waitlistData: [] } : {});
  
  setTimeout(() => {
    const modalRoot = document.getElementById('mobile-modal-root');
    const closeButtons = document.querySelectorAll('.mobile-modal-close, .court-conditions-close');
    
    console.log(`${type} modal:`, {
      isOpen: modalRoot?.classList.contains('modal-open'),
      closeButtonCount: closeButtons.length,
      contentLength: modalRoot?.innerHTML?.length || 0
    });
    
    // Test ESC key
    console.log(`Testing ESC key for ${type} modal...`);
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escEvent);
    
    setTimeout(() => {
      const stillOpenAfterEsc = modalRoot?.classList.contains('modal-open');
      console.log(`${type} modal still open after ESC:`, stillOpenAfterEsc);
      
      if (stillOpenAfterEsc) {
        // If ESC didn't work, try direct close
        console.log(`ESC failed, trying MobileModal.close() for ${type}...`);
        window.MobileModal.close();
        
        setTimeout(() => {
          const stillOpenAfterClose = modalRoot?.classList.contains('modal-open');
          console.log(`${type} modal still open after close():`, stillOpenAfterClose);
          
          if (stillOpenAfterClose) {
            console.log(`FORCE CLOSING ${type} modal by dispatching mm:close...`);
            document.dispatchEvent(new Event('mm:close'));
          }
          
          // Move to next test
          setTimeout(() => {
            currentTestIndex++;
            if (currentTestIndex < modalTypes.length) {
              testModal(modalTypes[currentTestIndex]);
            } else {
              console.log('\n=== ALL MODAL TESTS COMPLETE ===');
            }
          }, 500);
          
        }, 200);
      } else {
        console.log(`✅ ${type} modal closed successfully with ESC key`);
        // Move to next test
        setTimeout(() => {
          currentTestIndex++;
          if (currentTestIndex < modalTypes.length) {
            testModal(modalTypes[currentTestIndex]);
          } else {
            console.log('\n=== ALL MODAL TESTS COMPLETE ===');
          }
        }, 500);
      }
    }, 200);
    
  }, 1000);
}

// Start testing
if (modalTypes.length > 0) {
  testModal(modalTypes[0]);
}