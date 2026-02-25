# Accessibility — NOLTC Tennis Registration System

## Current Support

### ARIA attributes

| Pattern | Files | Examples |
|---------|-------|---------|
| `aria-live="polite"` | HomeScreen, GroupScreen | Search results, status messages |
| `aria-label` | MobileModalSheet, GroupScreen, QRScanner, MobileGroupSearchModal | Close buttons, remove-player buttons |
| `aria-modal` + `aria-labelledby` | MobileModalSheet | Modal dialog identification |
| `aria-hidden` | Icons.jsx (shared + registration) | Decorative SVG icons |

### Focus management

| Behavior | Location |
|----------|----------|
| Modal close restores focus to opener | `MobileModalSheet.jsx` |
| `autoFocus` on primary inputs | HomeScreen (member ID), MobileGroupSearchModal, AIAssistantAdmin |
| Programmatic focus on add-player flows | GroupScreen (`addPlayerInputRef`, `guestInputRef`) |
| `tabIndex` on interactive court cards | CourtCard.jsx (only when clickable) |
| Focus on block reason input | BlockReasonSelector.jsx |

### Keyboard support

| Interaction | Location | Handler |
|-------------|----------|---------|
| Enter to submit member search | HomeScreen:104 | `onKeyDown` — selects single match or shows "no member found" |
| Enter to select player suggestion | GroupScreen:242 | `onKeyDown` — auto-selects when exactly one suggestion |
| Enter to send AI message | AIAssistantAdmin:518 | `onKeyPress` |
| Court card keyboard activation | CourtCard.jsx:142-143 | `role="button"` + `tabIndex={0}` when clickable |

### Semantic HTML

Most interactive elements use `<button>` elements correctly:
- Tab navigation (TabNavigation.jsx)
- Waitlist reorder/remove actions (WaitlistSection.jsx, StatusSection.jsx)
- Calendar navigation (EventCalendarEnhanced.jsx)
- Form submissions and save actions

## Known Gaps

### Sortable table headers (keyboard-inaccessible)

`GuestChargeLog.jsx` — 5 `<th>` elements with `onClick` handlers for column sorting but no `tabIndex`, `role`, or `onKeyDown`.

**Fix pattern:**
```jsx
<th
  role="columnheader"
  tabIndex={0}
  aria-sort={sortField === 'timestamp' ? sortOrder === 'asc' ? 'ascending' : 'descending' : 'none'}
  onClick={() => handleSort('timestamp')}
  onKeyDown={(e) => e.key === 'Enter' && handleSort('timestamp')}
>
```

### Click-away overlay (minor)

`QuickActionsMenu.jsx` — `<div onClick={onClose}>` overlay for closing menu. Standard pattern but not keyboard-accessible. Users can press Escape as an alternative (if implemented).

### Missing focus trapping in modals

Modal dialogs (`MobileModalSheet.jsx`) use `aria-modal="true"` but do not trap focus — Tab can escape the modal into background content.

**Recommended fix:** Add a focus-trap utility or use `focus-trap-react` library for modal content wrappers.

### No skip-to-content links

None of the apps provide "Skip to main content" links for keyboard navigation.

### Color contrast

No formal contrast audit performed. Tailwind default colors are used throughout — generally meets WCAG AA but unverified. Key areas to audit:
- Court status colors (green/blue/red) against white text
- Disabled button states
- Toast notification text

### Screen reader testing

No screen reader testing has been performed. Priority areas:
1. Registration flow (HomeScreen → GroupScreen → CourtSelection → Success)
2. Courtboard display (real-time court status updates)
3. Admin panel (tab navigation, settings, waitlist management)

## Deployment Context

The primary deployment is a **kiosk tablet** in a tennis club. This affects accessibility priorities:
- Touch is the primary input method (not keyboard)
- Screen reader support is low priority for kiosk but important for admin panel (desktop)
- Large touch targets are more important than keyboard tab order for kiosk
- Color contrast matters for the courtboard lobby display (variable lighting)

## How to Test

### Keyboard navigation checklist

1. **HomeScreen**: Tab to search input → type member ID → Enter submits → `aria-live` announces results
2. **GroupScreen**: Tab through player list → add player input → guest form toggle → continue button
3. **CourtSelectionScreen**: Tab to court cards → Enter/Space selects (CourtCard has `role="button"`)
4. **Admin tabs**: Tab moves between tab buttons → Enter activates tab
5. **Modals**: Focus moves into modal on open → close button → focus returns to trigger

### Quick audit

```bash
# Check aria attribute usage
rg "aria-" src/ --include="*.jsx" --include="*.tsx" | grep -v test | grep -v node_modules

# Check for onClick without keyboard handlers on non-button elements
rg "<(div|span|li|td|th)\s[^>]*onClick" src/ --include="*.jsx" --include="*.tsx"

# Check role usage
rg 'role=' src/ --include="*.jsx" --include="*.tsx" | grep -v test
```

### Recommended tools

- **axe-core**: automated a11y testing (`@axe-core/react` for development)
- **VoiceOver** (macOS): screen reader testing for critical flows
- **Lighthouse**: accessibility scoring in Chrome DevTools
- **eslint-plugin-jsx-a11y**: lint-time a11y rule enforcement

## Improvement Roadmap

| Priority | Item | Effort |
|----------|------|--------|
| 1 | Add `eslint-plugin-jsx-a11y` to catch new issues at lint time | Low |
| 2 | Add keyboard support to sortable table headers (GuestChargeLog) | Low |
| 3 | Add focus trapping to modal dialogs | Medium |
| 4 | Run Lighthouse a11y audit on all 3 apps | Low |
| 5 | Add skip-to-content links | Low |
| 6 | Color contrast audit (especially courtboard display colors) | Medium |
| 7 | Screen reader testing on registration golden flow | Medium |
