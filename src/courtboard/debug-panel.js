// Debug Panel - Only visible when ?debug=1
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('debug') !== '1') return;

  const debugPanel = document.createElement('div');
  debugPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 350px;
    max-height: 500px;
    background: rgba(0, 0, 0, 0.85);
    color: #0f0;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    padding: 10px;
    border-radius: 4px;
    overflow-y: auto;
    z-index: 99999;
    pointer-events: auto;
    border: 1px solid #0f0;
  `;
  debugPanel.innerHTML = `
    <div style="color: #ff0; margin-bottom: 5px;">DEBUG MODE - Events Log</div>
    <div style="margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 8px;">
      <button id="runSelfTests" style="background: #333; color: #0f0; border: 1px solid #0f0; padding: 4px 8px; border-radius: 3px; font-family: inherit; font-size: 10px; cursor: pointer;">Run self-tests</button>
      <span style="color: #666; font-size: 10px; margin-left: 8px;">Press 't' to run</span>
      <div id="selfTestResults" style="margin-top: 5px; font-size: 10px;"></div>
    </div>
    <div id="debugContent"></div>
  `;
  document.body.appendChild(debugPanel);

  const updateDebugPanel = () => {
    if (!window.Tennis || !window.Tennis.Events || !window.Tennis.Events.debug) return;

    const events = window.Tennis.Events.debug.getLog();
    const content = document.getElementById('debugContent');
    if (!content) return;

    content.innerHTML = events
      .map((event) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        return `<div style="margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px solid #333;">
        <div style="color: #ff0;">[${time}] ${event.type}</div>
        <div style="color: #0ff;">${event.eventName}</div>
        ${event.data ? `<div style="color: #fff; font-size: 10px;">${JSON.stringify(event.data, null, 2)}</div>` : ''}
      </div>`;
      })
      .join('');
  };

  // Safe wrapper for self-tests
  function runSelfTestsSafe() {
    const fn = window.Tennis?.selfTest?.runAll;
    if (typeof fn !== 'function') {
      return {
        passed: 0,
        failed: 1,
        results: [
          { name: 'SelfTest not available', ok: false, notes: 'Tennis.selfTest.runAll missing' },
        ],
      };
    }
    try {
      return fn();
    } catch (e) {
      return {
        passed: 0,
        failed: 1,
        results: [{ name: 'Run failed', ok: false, notes: String(e?.message || e) }],
      };
    }
  }

  function renderSelfTestResults(result) {
    const resultsDiv = document.getElementById('selfTestResults');
    if (!resultsDiv) return;

    const timestamp = new Date().toLocaleTimeString();
    const passed = result.passed || 0;
    const failed = result.failed || 0;

    // Summary with color coding
    const summaryColor = failed > 0 ? '#f00' : '#0f0';
    let html = `<div style="color: ${summaryColor}; font-weight: bold;">${passed} passed / ${failed} failed</div>`;
    html += `<div style="color: #666; font-size: 9px;">Last run: ${timestamp}</div>`;

    // Compact table
    if (result.results && result.results.length > 0) {
      html += '<div style="margin-top: 5px; max-height: 150px; overflow-y: auto;">';
      html += '<table style="width: 100%; font-size: 9px; border-collapse: collapse;">';
      html +=
        '<tr style="color: #ff0;"><th style="text-align: left; padding: 2px;">Test</th><th style="text-align: center; padding: 2px;">OK</th><th style="text-align: left; padding: 2px;">Notes</th></tr>';

      result.results.forEach((test) => {
        const okColor = test.ok ? '#0f0' : '#f00';
        const okText = test.ok ? '✓' : '✗';
        html += `<tr style="border-top: 1px solid #333;">`;
        html += `<td style="padding: 2px; color: #fff;">${test.name || test.Test || ''}</td>`;
        html += `<td style="padding: 2px; text-align: center; color: ${okColor};">${okText}</td>`;
        html += `<td style="padding: 2px; color: #aaa;">${(test.notes || test.Notes || '').slice(0, 30)}${(test.notes || test.Notes || '').length > 30 ? '...' : ''}</td>`;
        html += `</tr>`;
      });
      html += '</table></div>';
    }

    resultsDiv.innerHTML = html;
  }

  let running = false;
  async function handleRunSelfTests() {
    if (running) return;
    running = true;
    try {
      const resultsDiv = document.getElementById('selfTestResults');
      if (resultsDiv) {
        resultsDiv.innerHTML = '<div style="color: #ff0;">Running tests...</div>';
      }
      const result = await runSelfTestsSafe();
      renderSelfTestResults(result);
    } finally {
      running = false;
    }
  }

  // Button click handler
  const runButton = document.getElementById('runSelfTests');
  if (runButton) {
    runButton.addEventListener('click', handleRunSelfTests);
  }

  // Keyboard shortcut (t key)
  window.addEventListener(
    'keydown',
    (e) => {
      if ((e.key || '').toLowerCase() === 't') {
        e.preventDefault();
        handleRunSelfTests();
      }
    },
    { passive: false }
  );

  // Update every 500ms
  setInterval(updateDebugPanel, 500);

  // Initial update
  setTimeout(updateDebugPanel, 100);
})();
