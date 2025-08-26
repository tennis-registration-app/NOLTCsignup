// Debug script specifically for court-conditions modal
// Run this in CourtBoard.html?view=mobile console

console.log('=== COURT CONDITIONS MODAL DEBUG ===');

// 1. Open court-conditions modal
console.log('\n1. Opening court-conditions modal...');
if (window.MobileModal) {
  window.MobileModal.open('court-conditions');
  
  setTimeout(() => {
    console.log('\n2. Modal should be open, checking structure...');
    
    const modalRoot = document.getElementById('mobile-modal-root');
    const modalContent = document.querySelector('.mobile-modal-content');
    const modalHeader = document.querySelector('.mobile-modal-header');
    const modalBody = document.querySelector('.mobile-modal-body');
    const iframe = document.querySelector('.modal-court-conditions iframe');
    const courtConditionsDiv = document.querySelector('.modal-court-conditions');
    
    console.log('DOM Structure:', {
      modalRoot: !!modalRoot,
      modalRootClass: modalRoot?.className,
      modalContent: !!modalContent,
      modalContentClass: modalContent?.className,
      modalHeader: !!modalHeader,
      modalHeaderVisible: modalHeader ? getComputedStyle(modalHeader).display !== 'none' : false,
      modalBody: !!modalBody,
      iframe: !!iframe,
      courtConditionsDiv: !!courtConditionsDiv
    });
    
    // Check close buttons
    const allCloseButtons = document.querySelectorAll('.mobile-modal-close, .court-conditions-close');
    console.log('\nClose buttons found:', allCloseButtons.length);
    
    allCloseButtons.forEach((btn, i) => {
      const style = getComputedStyle(btn);
      console.log(`Button ${i + 1}:`, {
        className: btn.className,
        visible: style.display !== 'none',
        zIndex: style.zIndex,
        position: style.position,
        pointerEvents: style.pointerEvents,
        textContent: btn.textContent.trim(),
        clickable: btn.onclick !== null || btn.hasAttribute('onclick'),
        boundingRect: btn.getBoundingClientRect()
      });
      
      // Test if element is actually clickable at its position
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);
      
      console.log(`  - Element at button center:`, {
        isSameElement: elementAtPoint === btn,
        actualElement: elementAtPoint?.className || elementAtPoint?.tagName
      });
    });
    
    // Test the close functionality manually
    if (allCloseButtons.length > 0) {
      console.log('\n3. Testing close button click...');
      const closeBtn = allCloseButtons[allCloseButtons.length - 1]; // Try the last one (court-conditions-close)
      
      let clickEventFired = false;
      const testClickListener = () => {
        clickEventFired = true;
        console.log('✅ Click event fired on close button');
      };
      
      closeBtn.addEventListener('click', testClickListener);
      
      // Programmatically click
      console.log('Clicking button programmatically...');
      closeBtn.click();
      
      setTimeout(() => {
        console.log('Click test result:', {
          eventFired: clickEventFired,
          modalStillOpen: modalRoot?.classList.contains('modal-open')
        });
        
        closeBtn.removeEventListener('click', testClickListener);
        
        // Try escape key
        console.log('\n4. Testing ESC key...');
        const escEvent = new KeyboardEvent('keydown', { 
          key: 'Escape', 
          keyCode: 27, 
          which: 27,
          bubbles: true, 
          cancelable: true 
        });
        document.dispatchEvent(escEvent);
        
        setTimeout(() => {
          console.log('ESC key result:', {
            modalStillOpen: modalRoot?.classList.contains('modal-open')
          });
          
          // Force close for cleanup
          console.log('\n5. Force closing modal for cleanup...');
          window.MobileModal.close();
          
        }, 200);
        
      }, 200);
    }
    
  }, 1000);
  
} else {
  console.error('MobileModal not available');
}

console.log('\n=== END COURT CONDITIONS DEBUG ===');