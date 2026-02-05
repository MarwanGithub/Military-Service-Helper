# Debt Ledger - Project Documentation

## Overview
**Debt Ledger** is a single-page web application for tracking personal money exchanges and debts. It's designed as a Progressive Web App (PWA) with offline support, featuring a modern dark UI with a focus on simplicity and mobile-first design.

## Purpose
The app tracks money you receive from and spend for another person, calculating a net position to show whether you're holding money for them or if they owe you money.

## Key Features

### 1. **Transaction Management**
- Add transactions with amount, date, category, and optional description
- Two transaction types:
  - **Received**: Money received from someone (increases your holding)
  - **Spent**: Money spent on behalf of someone (decreases your holding)
- View recent transactions (last 5) on main page
- View all transactions on dedicated page
- Click any transaction to view full details in a modal
- Delete individual transactions
- Clear all transactions at once

### 2. **Net Position Dashboard**
- Real-time calculation of net position
- Dynamic color coding:
  - **Green**: Positive balance (you have their money)
  - **Red**: Negative balance (you owe them money)
  - **Gray/Neutral**: All settled up ($0.00)
- Visual glow effects on amounts

### 3. **Smart Recommendations**
- **Amount Recommendations**: Shows last 4 used amounts as quick-select chips
- **Description Recommendations**: Shows last 6 used descriptions as quick-select chips
- Both stored in localStorage and updated automatically

### 4. **Copy Functionality**
- Copy recent transactions as formatted text (Arabic translation included)
- Customizable number of transactions to copy (1-100)
- Includes net position and timestamps
- Optimized for sharing via messaging apps

### 5. **Progressive Web App**
- Installable on mobile devices
- Works offline via Service Worker
- App manifest with custom icons
- Responsive design (mobile-first)

## Technical Architecture

### File Structure
```
├── index.html          # Main application (single-file architecture)
├── sw.js               # Service Worker for offline support
└── PROJECT.md          # This documentation file
```

### Technology Stack
- **Pure HTML/CSS/JavaScript** - No frameworks or dependencies
- **LocalStorage** - Client-side data persistence
- **Service Worker** - Offline functionality
- **CSS Variables** - Theming system
- **CSS Grid/Flexbox** - Layout system

## Data Structure

### Transaction Object
```javascript
{
  id: string,           // Unique identifier (timestamp + random)
  amount: number,       // Transaction amount (always positive)
  category: string,     // 'received' or 'spent-his'
  description: string,  // Optional description
  date: string,         // ISO date string (YYYY-MM-DD)
  timestamp: number     // Unix timestamp (ms) - when transaction was added
}
```

### LocalStorage Keys
- `debt_ledger_transactions` - Array of transaction objects
- `debt_ledger_descriptions` - Array of saved descriptions (max 10)
- `debt_ledger_amounts` - Array of saved amounts (max 8)

## Core Logic

### Net Position Calculation
```javascript
netPosition = sum of all transactions where:
  - 'received' transactions ADD to position
  - 'spent-his' transactions SUBTRACT from position
```

**Interpretation:**
- Positive balance: You are holding their money
- Negative balance: You owe them money
- Zero: All settled

### Transaction Sorting
Transactions are sorted by:
1. Date (descending - newest first)
2. Timestamp (descending - for same-date transactions)

## UI Components

### 1. **Dashboard Card**
- Location: Top of main page
- Displays net position with dynamic styling
- Shows descriptive text based on balance

### 2. **Transaction Form**
- Compact grid layout
- Category toggle buttons (visual selection)
- Auto-populated date (defaults to today)
- Smart recommendations below inputs
- Number input without spinner controls (arrows removed)

### 3. **Transaction Receipt Cards**
- Color-coded left border (green/red)
- Shows type badge, amount, date
- Truncated description with ellipsis
- Hover effects and click to open modal

### 4. **Detail Modal**
- Bottom sheet style on mobile
- Swipe-down to close gesture
- Full transaction details
- Delete button with confirmation

### 5. **All Transactions Page**
- Full-screen overlay
- Sticky header with back button
- Transaction count badge
- Copy functionality with custom count
- Shows all transactions (no pagination)

## Styling System

### CSS Variables (Theme)
```css
--bg-primary: #0a0a0f        /* Main background */
--bg-secondary: #12121a      /* Card backgrounds */
--bg-card: #1a1a24          /* Elevated cards */
--bg-elevated: #222230      /* Hover states */
--text-primary: #f0f0f5     /* Main text */
--text-secondary: #8888a0   /* Secondary text */
--text-muted: #55556a       /* Muted text */
--accent-green: #00d68f     /* Positive/received */
--accent-red: #ff5c6c       /* Negative/spent */
--accent-amber: #ffb547     /* Highlights */
```

### Design Principles
- **Dark theme** with subtle gradients
- **Monospace fonts** for amounts (financial clarity)
- **Smooth animations** (fade, slide, hover effects)
- **Touch-friendly** (large tap targets, gestures)
- **Minimal borders** (subtle transparency-based borders)
- **Glow effects** on key elements

## Important Implementation Notes

### 1. **Number Input Spinners Removed**
Custom CSS removes default browser spinner arrows on number inputs:
```css
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
}
```

### 2. **Date Handling**
- Dates stored as ISO strings (YYYY-MM-DD)
- Formatted for display as "MMM DD, YYYY"
- Timestamps stored as Unix milliseconds for precise ordering

### 3. **Form Reset After Submission**
- Amount and description cleared
- Date reset to today
- Category reset to "Spent" (default)
- Recommendations refreshed

### 4. **Mobile Optimization**
- Safe area insets for notched devices
- Touch gestures (swipe to close modal)
- No text selection on interactive elements
- Responsive breakpoint at 380px and 481px

### 5. **Copy Feature**
- Generates Arabic-translated text format
- Includes net position summary
- Formatted for readability in messaging apps
- Fallback for older browsers without Clipboard API

## Event Listeners

### Key Interactions
- Form submission → Add transaction
- Category buttons → Toggle selection
- Receipt cards → Open detail modal
- Delete button → Confirm and delete
- Clear All → Confirm and clear
- View All → Open full-page view
- Copy button → Copy to clipboard
- Recommendation chips → Auto-fill form
- ESC key → Close all transactions page
- Swipe gestures → Close modal

## Service Worker

### Cache Strategy
- Caches the main HTML file and service worker
- Offline-first approach for cached resources
- Network-first for uncached resources

### Files
- `sw.js` - Main service worker implementation

## Future Enhancement Considerations

### Potential Features
1. **Export/Import**: JSON export for backup/restore
2. **Multi-person tracking**: Track debts with multiple people
3. **Statistics**: Monthly summaries, charts, trends
4. **Currency support**: Multiple currency options
5. **Receipt photos**: Attach images to transactions
6. **Recurring transactions**: Auto-add regular payments
7. **Search/Filter**: Filter by date range, amount, description
8. **Undo functionality**: Undo recent deletions
9. **Categories**: Custom transaction categories
10. **Cloud sync**: Optional cloud backup

### Technical Improvements
1. IndexedDB for larger datasets
2. Virtual scrolling for performance with many transactions
3. Web Share API integration
4. Dark/light theme toggle
5. Accessibility improvements (ARIA labels, keyboard navigation)
6. Animation preferences (respect prefers-reduced-motion)

## Development Guidelines

### When Modifying This Project
1. **Maintain single-file architecture** unless absolutely necessary
2. **Test on mobile devices** - this is mobile-first
3. **Preserve localStorage structure** - breaking changes affect existing users
4. **Keep no-dependency approach** - pure vanilla JS
5. **Test offline functionality** - PWA is core feature
6. **Maintain visual consistency** - follow existing design system
7. **Update service worker version** when changing cached files

### Code Organization
The code is organized into logical sections with clear comments:
- State Management
- LocalStorage Functions
- Core Logic
- UI Updates
- Modal Functions
- Transaction Operations
- Event Listeners
- Recommendations System
- Service Worker Registration

### Testing Checklist
- [ ] Add transaction (both types)
- [ ] View transaction details
- [ ] Delete transaction
- [ ] Clear all transactions
- [ ] Copy transactions
- [ ] View all transactions page
- [ ] Recommendations work correctly
- [ ] Net position calculates correctly
- [ ] Works offline (after first load)
- [ ] Responsive on mobile sizes
- [ ] Form validation works
- [ ] Modal gestures work
- [ ] Data persists after reload

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript enabled
- Requires LocalStorage support
- Service Worker for offline (optional but recommended)

## Performance Notes
- Single HTML file: ~60KB
- No external dependencies
- Minimal runtime overhead
- LocalStorage reads on page load only
- Virtual DOM not needed (simple updates)
- CSS animations use GPU-accelerated properties

## Security Considerations
- All data stored locally (no server)
- No sensitive data transmission
- No authentication required
- No external API calls
- CSP compatible (inline scripts in single file)

---

**Last Updated**: January 2026  
**Version**: 1.0  
**License**: Not specified  
**Author**: Not specified

