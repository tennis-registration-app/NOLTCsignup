// Test script for mobile modal data
// Run this in CourtBoard.html?view=mobile console

console.log('=== MOBILE MODAL DATA TEST ===');

// 1. Test court blocks data
console.log('\n1. Testing Court Blocks Data:');
function readCourtBlocksSafe() { 
  try { 
    const storage = window.Tennis?.Storage;
    const blocksKey = 'courtBlocks';
    if (storage?.readJSON) {
      return storage.readJSON(blocksKey) || [];
    }
    const data = localStorage.getItem(blocksKey);
    return data ? JSON.parse(data) : [];
  } catch(e) { 
    console.error('Error reading blocks:', e);
    return []; 
  } 
}

const blocks = readCourtBlocksSafe();
console.log('  - Found blocks:', blocks.length);
console.log('  - Sample block:', blocks[0]);

// 2. Test reserved filtering
console.log('\n2. Testing Reserved Filtering:');
function selectReservedSafe(blocks, now) { 
  try { 
    if (!Array.isArray(blocks)) return [];
    const currentTime = now.getTime();
    return blocks.filter(block => {
      const startTime = new Date(block.startTime).getTime();
      const endTime = new Date(block.endTime).getTime();
      return startTime <= currentTime && currentTime <= endTime;
    }).map(block => ({
      courts: [block.courtNumber],
      reason: block.reason || block.templateName || 'Reserved',
      startTime: block.startTime,
      endTime: block.endTime
    }));
  } catch(e) { 
    console.error('Error filtering reserved:', e);
    return []; 
  } 
}

const reserved = selectReservedSafe(blocks, new Date());
console.log('  - Current reserved:', reserved.length);
console.log('  - Reserved courts:', reserved);

// 3. Test waitlist data
console.log('\n3. Testing Waitlist Data:');
function readWaitlistSafe() { 
  try { 
    const waitlist = window.Tennis?.Domain?.Waitlist;
    const storage = window.Tennis?.Storage;
    
    if (waitlist?.read) {
      return waitlist.read(window.Tennis?.State) || [];
    }
    
    const waitlistKey = 'waitlist';
    if (storage?.readJSON) {
      return storage.readJSON(waitlistKey) || [];
    }
    
    const data = localStorage.getItem(waitlistKey);
    return data ? JSON.parse(data) : [];
  } catch(e) { 
    console.error('Error reading waitlist:', e);
    return []; 
  } 
}

const waitlist = readWaitlistSafe();
console.log('  - Found waitlist entries:', waitlist.length);
console.log('  - Sample waitlist:', waitlist[0]);

// 4. Test modal opening with data
console.log('\n4. Testing Modal Opening with Real Data:');

if (window.MobileModal) {
  // Test reserved modal
  console.log('  - Testing Reserved modal...');
  window.MobileModal.open('reserved', { reservedData: reserved });
  
  setTimeout(() => {
    // Close and test waitlist
    window.MobileModal.close();
    console.log('  - Testing Waitlist modal...');
    window.MobileModal.open('waitlist', { waitlistData: waitlist });
    
    setTimeout(() => {
      // Close and test court conditions
      window.MobileModal.close();
      console.log('  - Testing Court Conditions modal...');
      window.MobileModal.open('court-conditions');
    }, 2000);
  }, 3000);
  
} else {
  console.error('  ❌ MobileModal not available');
}

console.log('\n=== TEST COMPLETE ===');
console.log('Watch for modals opening with real data above...');