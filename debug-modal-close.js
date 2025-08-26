// Debug script for modal close issue
// Run this in CourtBoard.html?view=mobile console

console.log('=== MODAL CLOSE DEBUG TEST ===');

// 1. Check if MobileModal exists and has close function
console.log('\n1. Checking MobileModal:');
console.log('  - MobileModal exists:', !!window.MobileModal);
console.log('  - MobileModal.close exists:', !!window.MobileModal?.close);
console.log('  - MobileModal.open exists:', !!window.MobileModal?.open);

// Check React availability
console.log('\n1.5. Checking React:');
console.log('  - React exists:', !!window.React);
console.log('  - ReactDOM exists:', !!window.ReactDOM);
console.log('  - IS_MOBILE_VIEW:', window.IS_MOBILE_VIEW);

// 2. Test opening court-conditions modal
console.log('\n2. Opening court-conditions modal...');
if (window.MobileModal) {
  // Set up event listeners to track events
  let openEventCount = 0;
  let closeEventCount = 0;
  
  const openListener = (e) => {
    openEventCount++;
    console.log(`  - mm:open event #${openEventCount}:`, e.detail);
  };
  
  const closeListener = (e) => {
    closeEventCount++;
    console.log(`  - mm:close event #${closeEventCount}:`, e);
  };
  
  document.addEventListener('mm:open', openListener);
  document.addEventListener('mm:close', closeListener);
  
  window.MobileModal.open('court-conditions');
  
  setTimeout(() => {
    console.log('\n3. Modal should be open now. Checking DOM:');
    const modalRoot = document.getElementById('mobile-modal-root');
    const modalOverlay = document.querySelector('.mobile-modal-overlay');
    const closeButtons = document.querySelectorAll('.mobile-modal-close, .court-conditions-close');
    
    console.log('  - Modal root exists:', !!modalRoot);
    console.log('  - Modal root has modal-open class:', modalRoot?.classList.contains('modal-open'));
    console.log('  - Modal root innerHTML length:', modalRoot?.innerHTML?.length || 0);
    console.log('  - Modal overlay exists:', !!modalOverlay);
    console.log('  - Close buttons found:', closeButtons.length);
    
    closeButtons.forEach((btn, i) => {
      console.log(`  - Close button ${i + 1}:`, {
        className: btn.className,
        hasClickListener: btn.onclick !== null,
        textContent: btn.textContent.trim(),
        parentElement: btn.parentElement?.className
      });
      
      // Add test click listeners to see if click events are firing
      btn.addEventListener('click', (e) => {
        console.log(`  - CLICK detected on close button ${i + 1}`, {
          target: e.target.className,
          defaultPrevented: e.defaultPrevented,
          propagationStopped: e.cancelBubble
        });
      }, true); // Use capture phase
    });
    
    // Check if React component is actually rendered
    console.log('  - Modal content sample:', modalRoot?.innerHTML?.substring(0, 200) + '...');
    
    // 4. Test clicking close button programmatically
    if (closeButtons.length > 0) {
      console.log('\n4. Testing close button click programmatically...');
      setTimeout(() => {
        console.log('  - Clicking first close button...');
        closeButtons[0].click();
        
        setTimeout(() => {
          const stillOpen = modalRoot?.classList.contains('modal-open');
          console.log('  - Modal still open after button click:', stillOpen);
          console.log('  - Open events received:', openEventCount);
          console.log('  - Close events received:', closeEventCount);
        }, 200);
      }, 500);
    }
    
    // 5. Test MobileModal.close directly
    setTimeout(() => {
      console.log('\n5. Testing MobileModal.close() directly...');
      try {
        window.MobileModal.close();
        console.log('  - MobileModal.close() executed without error');
        
        setTimeout(() => {
          const stillOpen = modalRoot?.classList.contains('modal-open');
          console.log('  - Modal still open after close():', stillOpen);
          console.log('  - Total open events:', openEventCount);
          console.log('  - Total close events:', closeEventCount);
          
          // Cleanup
          document.removeEventListener('mm:open', openListener);
          document.removeEventListener('mm:close', closeListener);
          
        }, 200);
        
      } catch (e) {
        console.error('  - Error calling MobileModal.close():', e);
      }
    }, 2000);
    
  }, 1000);
} else {
  console.error('  - MobileModal not available');
}

console.log('\n=== END DEBUG TEST ===');
console.log('Check console output above for debug information.');