// =====================
// State Management
// =====================
const STORAGE_KEY = 'debt_ledger_transactions';
const DESCRIPTIONS_KEY = 'debt_ledger_descriptions';
const PINNED_DESCRIPTIONS_KEY = 'debt_ledger_pinned_descriptions';
const AMOUNTS_KEY = 'debt_ledger_amounts';
const SIDE_LEDGERS_KEY = 'debt_ledger_side_ledgers';

let transactions = loadTransactions();
let selectedTransactionId = null;
let savedDescriptions = loadDescriptions();
let pinnedDescriptions = loadPinnedDescriptions();
let savedAmounts = loadAmounts();
let sideLedgers = loadSideLedgers();
let currentSideLedgerId = null;

// =====================
// LocalStorage Functions
// =====================
function loadTransactions() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading transactions:', e);
        return [];
    }
}

function saveTransactions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
        console.error('Error saving transactions:', e);
        showToast('Error saving data');
    }
}

function loadDescriptions() {
    try {
        const data = localStorage.getItem(DESCRIPTIONS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading descriptions:', e);
        return [];
    }
}

function saveDescriptions() {
    try {
        localStorage.setItem(DESCRIPTIONS_KEY, JSON.stringify(savedDescriptions));
    } catch (e) {
        console.error('Error saving descriptions:', e);
    }
}

function addDescription(description) {
    const trimmed = description.trim();
    if (!trimmed || trimmed.length < 2) return;

    // Remove if already exists (to avoid duplicates)
    savedDescriptions = savedDescriptions.filter(d => d.toLowerCase() !== trimmed.toLowerCase());

    // Add to beginning (most recent first)
    savedDescriptions.unshift(trimmed);

    // Keep only last 10 descriptions
    if (savedDescriptions.length > 10) {
        savedDescriptions = savedDescriptions.slice(0, 10);
    }

    saveDescriptions();
}

function loadPinnedDescriptions() {
    try {
        const data = localStorage.getItem(PINNED_DESCRIPTIONS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading pinned descriptions:', e);
        return [];
    }
}

function savePinnedDescriptions() {
    try {
        localStorage.setItem(PINNED_DESCRIPTIONS_KEY, JSON.stringify(pinnedDescriptions));
    } catch (e) {
        console.error('Error saving pinned descriptions:', e);
    }
}

function togglePinDescription(desc) {
    const idx = pinnedDescriptions.findIndex(d => d.toLowerCase() === desc.toLowerCase());
    if (idx === -1) {
        pinnedDescriptions.push(desc);
        showToast('Description pinned');
    } else {
        pinnedDescriptions.splice(idx, 1);
        showToast('Description unpinned');
    }
    savePinnedDescriptions();
    updateRecommendations();
}

function isDescriptionPinned(desc) {
    return pinnedDescriptions.some(d => d.toLowerCase() === desc.toLowerCase());
}

function getMatchingDescriptions(input) {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return savedDescriptions.slice(0, 5);

    return savedDescriptions
        .filter(desc => desc.toLowerCase().includes(trimmed))
        .slice(0, 5);
}

function loadAmounts() {
    try {
        const data = localStorage.getItem(AMOUNTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading amounts:', e);
        return [];
    }
}

function saveAmounts() {
    try {
        localStorage.setItem(AMOUNTS_KEY, JSON.stringify(savedAmounts));
    } catch (e) {
        console.error('Error saving amounts:', e);
    }
}

function addAmount(amount) {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    // Remove if already exists (to avoid duplicates)
    savedAmounts = savedAmounts.filter(a => a !== numAmount);

    // Add to beginning (most recent first)
    savedAmounts.unshift(numAmount);

    // Keep only last 8 amounts
    if (savedAmounts.length > 8) {
        savedAmounts = savedAmounts.slice(0, 8);
    }

    saveAmounts();
}

// =====================
// Core Logic
// =====================
function calculateNetPosition() {
    return transactions.reduce((total, tx) => {
        switch (tx.category) {
            case 'received':
                return total + tx.amount; // His money I'm holding increases
            case 'spent-his':
                return total - tx.amount; // His money I'm holding decreases
            default:
                return total;
        }
    }, 0);
}

function getPositionDescription(amount) {
    if (amount > 0) {
        return `I have <strong>$${Math.abs(amount).toFixed(2)}</strong>`;
    } else if (amount < 0) {
        return `Owed <strong>$${Math.abs(amount).toFixed(2)}</strong>`;
    }
    return 'All settled up';
}

// =====================
// UI Updates
// =====================
function updateDashboard() {
    const dashboard = document.getElementById('dashboard');
    const amountEl = document.getElementById('positionAmount');
    const descEl = document.getElementById('positionDesc');

    const netPosition = calculateNetPosition();

    // Update classes
    dashboard.classList.remove('positive', 'negative', 'neutral');
    if (netPosition > 0) {
        dashboard.classList.add('positive');
    } else if (netPosition < 0) {
        dashboard.classList.add('negative');
    } else {
        dashboard.classList.add('neutral');
    }

    // Update display
    const sign = netPosition >= 0 ? '' : '-';
    amountEl.textContent = `${sign}$${Math.abs(netPosition).toFixed(2)}`;
    descEl.innerHTML = getPositionDescription(netPosition);
}

function renderTransactions() {
    const list = document.getElementById('transactionsList');
    const viewAllBtn = document.getElementById('viewAllBtn');

    if (transactions.length === 0) {
        list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <p>No transactions yet.<br>Add one above to get started.</p>
                    </div>
                `;
        viewAllBtn.style.display = 'none';
        return;
    }

    // Update View All button text
    if (transactions.length > 5) {
        viewAllBtn.textContent = `View All (${transactions.length})`;
        viewAllBtn.style.display = 'block';
    } else {
        viewAllBtn.textContent = 'View All';
        viewAllBtn.style.display = transactions.length > 0 ? 'block' : 'none';
    }

    // Sort by date descending, then by timestamp descending
    const sorted = [...transactions]
        .sort((a, b) => {
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.timestamp - a.timestamp;
        })
        .slice(0, 5);

    list.innerHTML = sorted.map(tx => {
        const typeClass = `type-${tx.category}`;
        const typeLabel = getCategoryLabel(tx.category);
        const sign = tx.category === 'received' ? '+' : '-';
        const formattedDate = formatDate(tx.date);

        return `
                    <div class="receipt ${typeClass}" data-id="${tx.id}">
                        <div class="receipt-header">
                            <span class="receipt-type">${typeLabel}</span>
                            <span class="receipt-amount">${sign}$${tx.amount.toFixed(2)}</span>
                        </div>
                        <p class="receipt-date">${formattedDate}</p>
                        ${tx.description ? `<p class="receipt-desc">${escapeHtml(tx.description)}</p>` : ''}
                    </div>
                `;
    }).join('');

    // Add click listeners
    list.querySelectorAll('.receipt').forEach(el => {
        el.addEventListener('click', () => openModal(el.dataset.id));
    });
}

function renderAllTransactions() {
    const list = document.getElementById('allTransactionsList');
    const countEl = document.getElementById('transactionCount');

    countEl.textContent = transactions.length;

    if (transactions.length === 0) {
        list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <p>No transactions yet.<br>Add one to get started.</p>
                    </div>
                `;
        return;
    }

    // Sort by date descending, then by timestamp descending (NO LIMIT)
    const sorted = [...transactions]
        .sort((a, b) => {
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.timestamp - a.timestamp;
        });

    list.innerHTML = sorted.map(tx => {
        const typeClass = `type-${tx.category}`;
        const typeLabel = getCategoryLabel(tx.category);
        const sign = tx.category === 'received' ? '+' : '-';
        const formattedDate = formatDate(tx.date);

        return `
                    <div class="receipt ${typeClass}" data-id="${tx.id}">
                        <div class="receipt-header">
                            <span class="receipt-type">${typeLabel}</span>
                            <span class="receipt-amount">${sign}$${tx.amount.toFixed(2)}</span>
                        </div>
                        <p class="receipt-date">${formattedDate}</p>
                        ${tx.description ? `<p class="receipt-desc">${escapeHtml(tx.description)}</p>` : ''}
                    </div>
                `;
    }).join('');

    // Add click listeners
    list.querySelectorAll('.receipt').forEach(el => {
        el.addEventListener('click', () => openModal(el.dataset.id));
    });
}

function openAllTransactionsPage() {
    document.getElementById('allTransactionsPage').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderAllTransactions();
}

function closeAllTransactionsPage() {
    document.getElementById('allTransactionsPage').classList.remove('active');
    document.body.style.overflow = '';
}

function getCategoryLabel(category) {
    switch (category) {
        case 'received': return 'Received';
        case 'spent-his': return 'Spent';
        default: return category;
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =====================
// Modal Functions
// =====================

// Calculate running balance BEFORE a specific transaction
function calculateRunningBalance(transactionId) {
    // Sort transactions chronologically (oldest first by date, then timestamp)
    const sorted = [...transactions].sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.timestamp - b.timestamp;
    });

    let runningBalance = 0;
    for (const tx of sorted) {
        // Stop BEFORE adding the target transaction
        if (tx.id === transactionId) {
            break;
        }

        if (tx.category === 'received') {
            runningBalance += tx.amount;
        } else if (tx.category === 'spent-his') {
            runningBalance -= tx.amount;
        }
    }

    return runningBalance;
}

function openModal(id) {
    selectedTransactionId = id;
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const detailsEl = document.getElementById('modalDetails');
    const sign = tx.category === 'received' ? '+' : '-';
    const colorClass = tx.category === 'received' ? 'green' : 'red';

    // Calculate running balance at this transaction
    const runningBalance = calculateRunningBalance(id);
    const balanceSign = runningBalance >= 0 ? '' : '-';
    const balanceColorClass = runningBalance > 0 ? 'green' : (runningBalance < 0 ? 'red' : '');

    detailsEl.innerHTML = `
                <div class="detail-row">
                    <span class="detail-label">Amount</span>
                    <span class="detail-value amount ${colorClass}">${sign}$${tx.amount.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Type</span>
                    <span class="detail-value">${getCategoryLabel(tx.category)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${formatDate(tx.date)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Added On</span>
                    <span class="detail-value">${formatTimestamp(tx.timestamp)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Balance Before</span>
                    <span class="detail-value amount ${balanceColorClass}">${balanceSign}$${Math.abs(runningBalance).toFixed(2)}</span>
                </div>
                ${tx.description ? `
                <div class="detail-row">
                    <span class="detail-label">Description</span>
                    <span class="detail-value description">${escapeHtml(tx.description)}</span>
                </div>
                ` : ''}
            `;

    // Show actions and reset title
    document.getElementById('modalActions').style.display = 'flex';
    document.querySelector('.modal-title').textContent = 'Transaction Details';

    // Set context for main ledger
    editingContext = 'main';

    // Reset delete button for main ledger context
    const deleteBtn = document.getElementById('deleteBtn');
    deleteBtn.onclick = () => {
        if (confirm('Delete this transaction?')) {
            deleteTransaction(selectedTransactionId);
        }
    };

    // Edit button for main ledger context
    const editBtn = document.getElementById('editBtn');
    editBtn.onclick = () => {
        showEditForm(tx);
    };

    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
    selectedTransactionId = null;
    editingContext = null;
}

// =====================
// Edit Transaction
// =====================
// Tracks whether we're editing a main or side ledger transaction
let editingContext = null; // null, 'main', or 'side'

function showEditForm(tx) {
    const detailsEl = document.getElementById('modalDetails');
    const actionsEl = document.getElementById('modalActions');

    // Hide actions buttons
    actionsEl.style.display = 'none';

    // Update modal title
    document.querySelector('.modal-title').textContent = 'Edit Transaction';

    const isReceived = tx.category === 'received';

    detailsEl.innerHTML = `
                <div class="modal-edit-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Amount</label>
                            <input type="number" id="editAmount" value="${tx.amount.toFixed(2)}" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" id="editDate" value="${tx.date}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <div class="category-toggle">
                            <button type="button" class="category-btn spent ${!isReceived ? 'active' : ''}" id="editSpentBtn">
                                <span class="dot"></span>
                                Spent
                            </button>
                            <button type="button" class="category-btn received ${isReceived ? 'active' : ''}" id="editReceivedBtn">
                                <span class="dot"></span>
                                Received
                            </button>
                        </div>
                        <input type="hidden" id="editCategory" value="${tx.category}">
                    </div>
                    <div class="form-group">
                        <label>Description (Optional)</label>
                        <textarea id="editDescription" placeholder="What was this for?">${tx.description ? escapeHtml(tx.description) : ''}</textarea>
                    </div>
                    <div class="modal-edit-actions">
                        <button type="button" class="modal-edit-cancel" id="editCancelBtn">Cancel</button>
                        <button type="button" class="modal-edit-save" id="editSaveBtn">Save</button>
                    </div>
                </div>
            `;

    // Category toggle listeners
    document.getElementById('editSpentBtn').addEventListener('click', () => {
        document.getElementById('editSpentBtn').classList.add('active');
        document.getElementById('editReceivedBtn').classList.remove('active');
        document.getElementById('editCategory').value = 'spent-his';
    });

    document.getElementById('editReceivedBtn').addEventListener('click', () => {
        document.getElementById('editReceivedBtn').classList.add('active');
        document.getElementById('editSpentBtn').classList.remove('active');
        document.getElementById('editCategory').value = 'received';
    });

    // Cancel button
    document.getElementById('editCancelBtn').addEventListener('click', () => {
        // Re-open the detail view
        if (editingContext === 'side') {
            openSideLedgerModal(selectedTransactionId);
        } else {
            openModal(selectedTransactionId);
        }
    });

    // Save button
    document.getElementById('editSaveBtn').addEventListener('click', () => {
        const newAmount = parseFloat(document.getElementById('editAmount').value);
        const newDate = document.getElementById('editDate').value;
        const newCategory = document.getElementById('editCategory').value;
        const newDescription = document.getElementById('editDescription').value.trim();

        if (!newAmount || newAmount <= 0) {
            showToast('Please enter a valid amount');
            return;
        }
        if (!newDate) {
            showToast('Please enter a valid date');
            return;
        }

        if (editingContext === 'side') {
            saveSideLedgerEdit(selectedTransactionId, newAmount, newDate, newCategory, newDescription);
        } else {
            saveMainEdit(selectedTransactionId, newAmount, newDate, newCategory, newDescription);
        }
    });

    // Focus amount field
    document.getElementById('editAmount').focus();
}

function saveMainEdit(txId, amount, date, category, description) {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    tx.amount = amount;
    tx.date = date;
    tx.category = category;
    tx.description = description;

    saveTransactions();
    updateDashboard();
    renderTransactions();

    if (document.getElementById('allTransactionsPage').classList.contains('active')) {
        renderAllTransactions();
    }

    closeModal();
    showToast('Transaction updated');
}

function saveSideLedgerEdit(txId, amount, date, category, description) {
    const ledger = sideLedgers.find(l => l.id === currentSideLedgerId);
    if (!ledger) return;

    const tx = ledger.transactions.find(t => t.id === txId);
    if (!tx) return;

    tx.amount = amount;
    tx.date = date;
    tx.category = category;
    tx.description = description;

    saveSideLedgers();
    updateSideLedgerDashboard();
    renderSideLedgerTransactions();
    renderSideLedgersList();

    closeModal();
    showToast('Transaction updated');
}

// =====================
// Transaction Operations
// =====================
function addTransaction(data) {
    const tx = {
        id: generateId(),
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description.trim(),
        date: data.date,
        timestamp: Date.now()
    };

    // Save description for future use
    if (tx.description) {
        addDescription(tx.description);
    }

    // Save amount for future use
    addAmount(tx.amount);

    transactions.push(tx);
    saveTransactions();
    updateDashboard();
    renderTransactions();
    showToast('Transaction added');
}

function deleteTransaction(id) {
    transactions = transactions.filter(tx => tx.id !== id);
    saveTransactions();
    updateDashboard();
    renderTransactions();
    // Update all transactions page if it's open
    if (document.getElementById('allTransactionsPage').classList.contains('active')) {
        renderAllTransactions();
    }
    closeModal();
    showToast('Transaction deleted');
}

function clearAllTransactions() {
    if (transactions.length === 0) return;

    if (confirm('Are you sure you want to delete all transactions? This cannot be undone.')) {
        transactions = [];
        saveTransactions();
        updateDashboard();
        renderTransactions();
        // Update all transactions page if it's open
        if (document.getElementById('allTransactionsPage').classList.contains('active')) {
            renderAllTransactions();
        }
        showToast('All transactions cleared');
    }
}

function copyTransactionsToClipboard(count) {
    if (transactions.length === 0) {
        showToast('No transactions to copy');
        return;
    }

    // Get the latest N transactions
    const sorted = [...transactions]
        .sort((a, b) => {
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.timestamp - a.timestamp;
        })
        .slice(0, count);

    // Arabic translations
    const translations = {
        received: 'مستلم',
        spent: 'صرفت',
        amount: 'المبلغ',
        description: 'الوصف',
        added: 'أضيف',
        netPosition: 'الرصيد الصافي',
        generated: 'تم الإنشاء',
        transactions: sorted.length > 1 ? 'معاملات' : 'معاملة',
        debtLedger: 'دفتر الديون',
        latest: 'آخر'
    };

    // Format as text (Arabic only)
    let text = `${translations.debtLedger}\n`;
    text += `${translations.latest} ${sorted.length} ${translations.transactions}\n`;
    text += `${formatTimestamp(Date.now())} :${translations.generated}\n`;
    text += `${translations.netPosition}: ${calculateNetPosition() >= 0 ? '+' : ''}$${calculateNetPosition().toFixed(2)}\n\n`;

    sorted.forEach((tx) => {
        const sign = tx.category === 'received' ? '+' : '-';
        const categoryArabic = tx.category === 'received' ? translations.received : translations.spent;

        text += `${categoryArabic}\n`;
        text += `${translations.amount}: ${sign}$${tx.amount.toFixed(2)}\n`;
        if (tx.description) {
            text += `${translations.description}: ${tx.description}\n`;
        }
        text += `${translations.added}: ${formatTimestamp(tx.timestamp)}\n`;
        text += '\n';
    });

    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast(`Copied ${sorted.length} transaction${sorted.length > 1 ? 's' : ''}`);
            })
            .catch((err) => {
                console.error('Failed to copy:', err);
                showToast('Failed to copy to clipboard');
            });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(`Copied ${sorted.length} transaction${sorted.length > 1 ? 's' : ''}`);
        } catch (err) {
            console.error('Failed to copy:', err);
            showToast('Failed to copy to clipboard');
        }
        document.body.removeChild(textArea);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// =====================
// Toast Notification
// =====================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// =====================
// Event Listeners
// =====================
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const dateInput = document.getElementById('date');
    dateInput.value = new Date().toISOString().split('T')[0];

    // Initial render
    updateDashboard();
    renderTransactions();
});

// Form submission
document.getElementById('transactionForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = {
        amount: document.getElementById('amount').value,
        category: document.getElementById('category').value,
        description: document.getElementById('description').value,
        date: document.getElementById('date').value
    };

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
        showToast('Please enter a valid amount');
        return;
    }

    addTransaction(formData);

    // Reset form
    document.getElementById('amount').value = '';
    document.getElementById('description').value = '';
    document.getElementById('date').value = new Date().toISOString().split('T')[0];

    // Reset category toggle
    document.getElementById('category').value = 'spent-his';
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === 'spent-his') {
            btn.classList.add('active');
        }
    });

    // Refresh recommendations
    updateRecommendations();
    updateAmountRecommendations();
});

// Category toggle buttons
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('category').value = btn.dataset.value;
    });
});

// Modal close
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});

// Delete transaction — handled via .onclick set dynamically in openModal / openSideLedgerModal

// Clear all
document.getElementById('clearAllBtn').addEventListener('click', clearAllTransactions);

// Copy transactions
document.getElementById('copyBtn').addEventListener('click', () => {
    const count = parseInt(document.getElementById('copyCount').value) || 5;
    if (count < 1 || count > 100) {
        showToast('Please enter a number between 1 and 100');
        return;
    }
    copyTransactionsToClipboard(count);
});

// View All button
document.getElementById('viewAllBtn').addEventListener('click', openAllTransactionsPage);

// Back button
document.getElementById('backBtn').addEventListener('click', closeAllTransactionsPage);

// Escape key to close all transactions page
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('allTransactionsPage').classList.contains('active')) {
        closeAllTransactionsPage();
    }
});

// Swipe down to close modal
let touchStartY = 0;
document.querySelector('.modal').addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
});

document.querySelector('.modal').addEventListener('touchmove', (e) => {
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY;

    if (diff > 100) {
        closeModal();
    }
});

// =====================
// Description Recommendations
// =====================
const descriptionInput = document.getElementById('description');
const recommendationsContainer = document.getElementById('recommendationsContainer');
const recommendationsList = document.getElementById('recommendationsList');

function updateRecommendations() {
    // Pinned always shown, then recent (deduped against pinned), up to 6
    const recentDeduped = savedDescriptions
        .filter(d => !isDescriptionPinned(d))
        .slice(0, 6);

    const allChips = [
        ...pinnedDescriptions.map(d => ({ desc: d, pinned: true })),
        ...recentDeduped.map(d => ({ desc: d, pinned: false }))
    ];

    if (allChips.length === 0) {
        recommendationsContainer.classList.remove('show');
        return;
    }

    recommendationsList.innerHTML = allChips.map(({ desc, pinned }) =>
        `<button type="button" class="recommendation-chip${pinned ? ' pinned' : ''}" title="${escapeHtml(desc)}${pinned ? '' : ' (long press to pin)'}">${escapeHtml(desc)}</button>`
    ).join('');

    recommendationsContainer.classList.add('show');

    // Attach click + long-press + right-click listeners
    recommendationsList.querySelectorAll('.recommendation-chip').forEach((chip, index) => {
        const { desc } = allChips[index];
        let pressTimer = null;
        let longPressHandled = false;

        // Tap / click — fill description field (skip if long press just fired)
        chip.addEventListener('click', () => {
            if (longPressHandled) {
                longPressHandled = false;
                return;
            }
            descriptionInput.value = desc;
            descriptionInput.focus();
        });

        // Right-click (desktop) — toggle pin
        // Also fires on Android after a long press, so guard with longPressHandled
        chip.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (longPressHandled) {
                longPressHandled = false;
                return;
            }
            togglePinDescription(desc);
        });

        // Long press (mobile) — toggle pin
        chip.addEventListener('touchstart', () => {
            longPressHandled = false;
            pressTimer = setTimeout(() => {
                pressTimer = null;
                longPressHandled = true;
                chip.classList.add('pinning');
                setTimeout(() => chip.classList.remove('pinning'), 400);
                togglePinDescription(desc);
            }, 600);
        }, { passive: true });

        chip.addEventListener('touchend', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });

        chip.addEventListener('touchmove', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        }, { passive: true });
    });
}

// Initialize recommendations on page load
document.addEventListener('DOMContentLoaded', () => {
    updateRecommendations();
});

// =====================
// Amount Recommendations
// =====================
const amountInput = document.getElementById('amount');
const amountRecommendationsContainer = document.getElementById('amountRecommendationsContainer');
const amountRecommendationsList = document.getElementById('amountRecommendationsList');

function updateAmountRecommendations() {
    // Get last 4 amounts
    const recentAmounts = savedAmounts.slice(0, 4);

    if (recentAmounts.length === 0) {
        amountRecommendationsContainer.classList.remove('show');
        return;
    }

    amountRecommendationsList.innerHTML = recentAmounts.map(amount =>
        `<button type="button" class="recommendation-chip" title="$${amount.toFixed(2)}">$${amount.toFixed(2)}</button>`
    ).join('');

    amountRecommendationsContainer.classList.add('show');

    // Add click listeners
    amountRecommendationsList.querySelectorAll('.recommendation-chip').forEach((chip, index) => {
        chip.addEventListener('click', () => {
            amountInput.value = recentAmounts[index].toFixed(2);
            amountInput.focus();
        });
    });
}

// Initialize amount recommendations on page load
document.addEventListener('DOMContentLoaded', () => {
    updateAmountRecommendations();
});

// =====================
// Side Ledger Recommendations
// =====================
const sideLedgerDescriptionInput = document.getElementById('sideLedgerDescription');
const sideLedgerRecommendationsContainer = document.getElementById('sideLedgerRecommendationsContainer');
const sideLedgerRecommendationsList = document.getElementById('sideLedgerRecommendationsList');
const sideLedgerAmountInputEl = document.getElementById('sideLedgerAmountInput');
const sideLedgerAmountRecommendationsContainer = document.getElementById('sideLedgerAmountRecommendationsContainer');
const sideLedgerAmountRecommendationsList = document.getElementById('sideLedgerAmountRecommendationsList');

function updateSideLedgerRecommendations() {
    const recentDeduped = savedDescriptions
        .filter(d => !isDescriptionPinned(d))
        .slice(0, 6);

    const allChips = [
        ...pinnedDescriptions.map(d => ({ desc: d, pinned: true })),
        ...recentDeduped.map(d => ({ desc: d, pinned: false }))
    ];

    if (allChips.length === 0) {
        sideLedgerRecommendationsContainer.classList.remove('show');
        return;
    }

    sideLedgerRecommendationsList.innerHTML = allChips.map(({ desc, pinned }) =>
        `<button type="button" class="recommendation-chip${pinned ? ' pinned' : ''}" title="${escapeHtml(desc)}${pinned ? '' : ' (long press to pin)'}">${escapeHtml(desc)}</button>`
    ).join('');

    sideLedgerRecommendationsContainer.classList.add('show');

    sideLedgerRecommendationsList.querySelectorAll('.recommendation-chip').forEach((chip, index) => {
        const { desc } = allChips[index];
        let pressTimer = null;
        let longPressHandled = false;

        chip.addEventListener('click', () => {
            if (longPressHandled) {
                longPressHandled = false;
                return;
            }
            sideLedgerDescriptionInput.value = desc;
            sideLedgerDescriptionInput.focus();
        });

        chip.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (longPressHandled) {
                longPressHandled = false;
                return;
            }
            togglePinDescription(desc);
        });

        chip.addEventListener('touchstart', () => {
            longPressHandled = false;
            pressTimer = setTimeout(() => {
                pressTimer = null;
                longPressHandled = true;
                chip.classList.add('pinning');
                setTimeout(() => chip.classList.remove('pinning'), 400);
                togglePinDescription(desc);
            }, 600);
        }, { passive: true });

        chip.addEventListener('touchend', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });

        chip.addEventListener('touchmove', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        }, { passive: true });
    });
}

function updateSideLedgerAmountRecommendations() {
    const recentAmounts = savedAmounts.slice(0, 4);

    if (recentAmounts.length === 0) {
        sideLedgerAmountRecommendationsContainer.classList.remove('show');
        return;
    }

    sideLedgerAmountRecommendationsList.innerHTML = recentAmounts.map(amount =>
        `<button type="button" class="recommendation-chip" title="$${amount.toFixed(2)}">$${amount.toFixed(2)}</button>`
    ).join('');

    sideLedgerAmountRecommendationsContainer.classList.add('show');

    sideLedgerAmountRecommendationsList.querySelectorAll('.recommendation-chip').forEach((chip, index) => {
        chip.addEventListener('click', () => {
            sideLedgerAmountInputEl.value = recentAmounts[index].toFixed(2);
            sideLedgerAmountInputEl.focus();
        });
    });
}

// =====================
// Side Ledgers Functions
// =====================
function loadSideLedgers() {
    try {
        const data = localStorage.getItem(SIDE_LEDGERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading side ledgers:', e);
        return [];
    }
}

function saveSideLedgers() {
    try {
        localStorage.setItem(SIDE_LEDGERS_KEY, JSON.stringify(sideLedgers));
    } catch (e) {
        console.error('Error saving side ledgers:', e);
        showToast('Error saving data');
    }
}

function calculateSideLedgerBalance(ledger) {
    return ledger.transactions.reduce((total, tx) => {
        switch (tx.category) {
            case 'received':
                return total + tx.amount;
            case 'spent-his':
                return total - tx.amount;
            default:
                return total;
        }
    }, 0);
}

function renderSideLedgersList() {
    const list = document.getElementById('sideLedgersList');

    if (sideLedgers.length === 0) {
        list.innerHTML = `
                    <div class="side-ledgers-empty">
                        <div class="side-ledgers-empty-icon">📒</div>
                        <p>No side ledgers yet.<br>Create one to track separate accounts.</p>
                    </div>
                `;
        return;
    }

    list.innerHTML = sideLedgers.map(ledger => {
        const balance = calculateSideLedgerBalance(ledger);
        const balanceClass = balance > 0 ? 'positive' : (balance < 0 ? 'negative' : 'neutral');
        const sign = balance >= 0 ? '' : '-';
        const txCount = ledger.transactions.length;

        return `
                    <div class="side-ledger-card" data-id="${ledger.id}">
                        <div class="side-ledger-card-header">
                            <div>
                                <p class="side-ledger-name">${escapeHtml(ledger.name)}</p>
                                <p class="side-ledger-meta">${txCount} transaction${txCount !== 1 ? 's' : ''}</p>
                            </div>
                            <span class="side-ledger-balance ${balanceClass}">${sign}$${Math.abs(balance).toFixed(2)}</span>
                        </div>
                    </div>
                `;
    }).join('');

    // Add click listeners
    list.querySelectorAll('.side-ledger-card').forEach(el => {
        el.addEventListener('click', () => openSideLedgerPage(el.dataset.id));
    });

    // Also update drawer
    renderDrawerSideLedgers();
}

function renderDrawerSideLedgers() {
    const list = document.getElementById('drawerSideLedgersList');

    // Update main ledger balance in drawer
    const mainBalance = calculateNetPosition();
    const mainBalanceEl = document.getElementById('drawerMainBalance');
    const mainBalanceClass = mainBalance > 0 ? 'positive' : (mainBalance < 0 ? 'negative' : 'neutral');
    const mainSign = mainBalance >= 0 ? '' : '-';
    mainBalanceEl.textContent = `${mainSign}$${Math.abs(mainBalance).toFixed(2)}`;
    mainBalanceEl.className = `drawer-item-balance ${mainBalanceClass}`;

    if (sideLedgers.length === 0) {
        list.innerHTML = `<p style="padding: 12px; color: var(--text-muted); font-size: 13px; text-align: center;">No side ledgers yet</p>`;
        return;
    }

    list.innerHTML = sideLedgers.map(ledger => {
        const balance = calculateSideLedgerBalance(ledger);
        const balanceClass = balance > 0 ? 'positive' : (balance < 0 ? 'negative' : 'neutral');
        const sign = balance >= 0 ? '' : '-';

        return `
                    <button class="drawer-item" data-id="${ledger.id}">
                        <div class="drawer-item-icon">📒</div>
                        <div class="drawer-item-info">
                            <div class="drawer-item-name">${escapeHtml(ledger.name)}</div>
                            <div class="drawer-item-balance ${balanceClass}">${sign}$${Math.abs(balance).toFixed(2)}</div>
                        </div>
                    </button>
                `;
    }).join('');

    // Add click listeners
    list.querySelectorAll('.drawer-item').forEach(el => {
        el.addEventListener('click', () => {
            closeDrawer();
            openSideLedgerPage(el.dataset.id);
        });
    });
}

function openDrawer() {
    document.getElementById('drawerOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderDrawerSideLedgers();
}

function closeDrawer() {
    document.getElementById('drawerOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function createSideLedger(name) {
    const ledger = {
        id: generateId(),
        name: name.trim(),
        transactions: [],
        createdAt: Date.now()
    };

    sideLedgers.push(ledger);
    saveSideLedgers();
    renderSideLedgersList();
    showToast('Side ledger created');
    return ledger;
}

function deleteSideLedger(id) {
    sideLedgers = sideLedgers.filter(l => l.id !== id);
    saveSideLedgers();
    renderSideLedgersList();
    closeSideLedgerPage();
    showToast('Side ledger deleted');
}

function openSideLedgerPage(id) {
    currentSideLedgerId = id;
    const ledger = sideLedgers.find(l => l.id === id);
    if (!ledger) return;

    document.getElementById('sideLedgerPageTitle').textContent = ledger.name;
    document.getElementById('sideLedgerPage').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset form
    document.getElementById('sideLedgerAmountInput').value = '';
    document.getElementById('sideLedgerDescription').value = '';
    document.getElementById('sideLedgerDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('sideLedgerCategory').value = 'spent-his';
    document.getElementById('sideLedgerSpentBtn').classList.add('active');
    document.getElementById('sideLedgerReceivedBtn').classList.remove('active');

    updateSideLedgerDashboard();
    renderSideLedgerTransactions();
    updateSideLedgerRecommendations();
    updateSideLedgerAmountRecommendations();
}

function closeSideLedgerPage() {
    document.getElementById('sideLedgerPage').classList.remove('active');
    document.body.style.overflow = '';
    currentSideLedgerId = null;
}

function updateSideLedgerDashboard() {
    const ledger = sideLedgers.find(l => l.id === currentSideLedgerId);
    if (!ledger) return;

    const dashboard = document.getElementById('sideLedgerDashboard');
    const amountEl = document.getElementById('sideLedgerAmount');
    const descEl = document.getElementById('sideLedgerDesc');

    const balance = calculateSideLedgerBalance(ledger);

    dashboard.classList.remove('positive', 'negative', 'neutral');
    if (balance > 0) {
        dashboard.classList.add('positive');
    } else if (balance < 0) {
        dashboard.classList.add('negative');
    } else {
        dashboard.classList.add('neutral');
    }

    const sign = balance >= 0 ? '' : '-';
    amountEl.textContent = `${sign}$${Math.abs(balance).toFixed(2)}`;
    descEl.innerHTML = getPositionDescription(balance);
}

function renderSideLedgerTransactions() {
    const ledger = sideLedgers.find(l => l.id === currentSideLedgerId);
    if (!ledger) return;

    const list = document.getElementById('sideLedgerTransactionsList');
    const countEl = document.getElementById('sideLedgerTxCount');

    countEl.textContent = ledger.transactions.length;

    if (ledger.transactions.length === 0) {
        list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <p>No transactions yet.<br>Add one above to get started.</p>
                    </div>
                `;
        return;
    }

    const sorted = [...ledger.transactions]
        .sort((a, b) => {
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.timestamp - a.timestamp;
        });

    list.innerHTML = sorted.map(tx => {
        const typeClass = `type-${tx.category}`;
        const typeLabel = getCategoryLabel(tx.category);
        const sign = tx.category === 'received' ? '+' : '-';
        const formattedDate = formatDate(tx.date);

        return `
                    <div class="receipt ${typeClass}" data-id="${tx.id}">
                        <div class="receipt-header">
                            <span class="receipt-type">${typeLabel}</span>
                            <span class="receipt-amount">${sign}$${tx.amount.toFixed(2)}</span>
                        </div>
                        <p class="receipt-date">${formattedDate}</p>
                        ${tx.description ? `<p class="receipt-desc">${escapeHtml(tx.description)}</p>` : ''}
                    </div>
                `;
    }).join('');

    // Add click listeners for side ledger transactions
    list.querySelectorAll('.receipt').forEach(el => {
        el.addEventListener('click', () => openSideLedgerModal(el.dataset.id));
    });
}

function addSideLedgerTransaction(data) {
    const ledger = sideLedgers.find(l => l.id === currentSideLedgerId);
    if (!ledger) return;

    const tx = {
        id: generateId(),
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description.trim(),
        date: data.date,
        timestamp: Date.now()
    };

    ledger.transactions.push(tx);
    saveSideLedgers();
    updateSideLedgerDashboard();
    renderSideLedgerTransactions();
    renderSideLedgersList(); // Update the card balance
    showToast('Transaction added');
}

function deleteSideLedgerTransaction(txId) {
    const ledger = sideLedgers.find(l => l.id === currentSideLedgerId);
    if (!ledger) return;

    ledger.transactions = ledger.transactions.filter(tx => tx.id !== txId);
    saveSideLedgers();
    updateSideLedgerDashboard();
    renderSideLedgerTransactions();
    renderSideLedgersList();
    closeModal();
    showToast('Transaction deleted');
}

function clearAllSideLedgerTransactions() {
    const ledger = sideLedgers.find(l => l.id === currentSideLedgerId);
    if (!ledger || ledger.transactions.length === 0) return;

    if (confirm('Are you sure you want to delete all transactions in this ledger? This cannot be undone.')) {
        ledger.transactions = [];
        saveSideLedgers();
        updateSideLedgerDashboard();
        renderSideLedgerTransactions();
        renderSideLedgersList();
        showToast('All transactions cleared');
    }
}

// Calculate running balance for side ledger transactions
function calculateSideLedgerRunningBalance(transactionId) {
    const ledger = sideLedgers.find(l => l.id === currentSideLedgerId);
    if (!ledger) return 0;

    const sorted = [...ledger.transactions].sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.timestamp - b.timestamp;
    });

    let runningBalance = 0;
    for (const tx of sorted) {
        if (tx.id === transactionId) {
            break;
        }

        if (tx.category === 'received') {
            runningBalance += tx.amount;
        } else if (tx.category === 'spent-his') {
            runningBalance -= tx.amount;
        }
    }

    return runningBalance;
}

function openSideLedgerModal(txId) {
    const ledger = sideLedgers.find(l => l.id === currentSideLedgerId);
    if (!ledger) return;

    const tx = ledger.transactions.find(t => t.id === txId);
    if (!tx) return;

    selectedTransactionId = txId;

    const detailsEl = document.getElementById('modalDetails');
    const sign = tx.category === 'received' ? '+' : '-';
    const colorClass = tx.category === 'received' ? 'green' : 'red';

    const runningBalance = calculateSideLedgerRunningBalance(txId);
    const balanceSign = runningBalance >= 0 ? '' : '-';
    const balanceColorClass = runningBalance > 0 ? 'green' : (runningBalance < 0 ? 'red' : '');

    detailsEl.innerHTML = `
                <div class="detail-row">
                    <span class="detail-label">Amount</span>
                    <span class="detail-value amount ${colorClass}">${sign}$${tx.amount.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Type</span>
                    <span class="detail-value">${getCategoryLabel(tx.category)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date</span>
                    <span class="detail-value">${formatDate(tx.date)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Added On</span>
                    <span class="detail-value">${formatTimestamp(tx.timestamp)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Balance Before</span>
                    <span class="detail-value amount ${balanceColorClass}">${balanceSign}$${Math.abs(runningBalance).toFixed(2)}</span>
                </div>
                ${tx.description ? `
                <div class="detail-row">
                    <span class="detail-label">Description</span>
                    <span class="detail-value description">${escapeHtml(tx.description)}</span>
                </div>
                ` : ''}
            `;

    // Show actions and reset title
    document.getElementById('modalActions').style.display = 'flex';
    document.querySelector('.modal-title').textContent = 'Transaction Details';

    // Set context for side ledger
    editingContext = 'side';

    // Update delete button for side ledger context
    const deleteBtn = document.getElementById('deleteBtn');
    deleteBtn.onclick = () => {
        if (confirm('Delete this transaction?')) {
            deleteSideLedgerTransaction(txId);
        }
    };

    // Edit button for side ledger context
    const editBtn = document.getElementById('editBtn');
    editBtn.onclick = () => {
        showEditForm(tx);
    };

    document.getElementById('modalOverlay').classList.add('active');
}

// =====================
// Drawer Event Listeners
// =====================

// Open drawer
document.getElementById('menuBtn').addEventListener('click', openDrawer);

// Close drawer
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
document.getElementById('drawerOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDrawer();
});

// Main ledger button in drawer
document.getElementById('drawerMainLedger').addEventListener('click', () => {
    closeDrawer();
    // If on side ledger page, close it
    if (document.getElementById('sideLedgerPage').classList.contains('active')) {
        closeSideLedgerPage();
    }
    // If on all transactions page, close it
    if (document.getElementById('allTransactionsPage').classList.contains('active')) {
        closeAllTransactionsPage();
    }
});

// Create button in drawer
document.getElementById('drawerCreateBtn').addEventListener('click', () => {
    closeDrawer();
    document.getElementById('createLedgerModal').classList.add('active');
    document.getElementById('newLedgerName').value = '';
    document.getElementById('newLedgerName').focus();
});

// =====================
// Side Ledger Event Listeners
// =====================

// Create ledger modal
document.getElementById('createLedgerBtn').addEventListener('click', () => {
    document.getElementById('createLedgerModal').classList.add('active');
    document.getElementById('newLedgerName').value = '';
    document.getElementById('newLedgerName').focus();
});

document.getElementById('createLedgerCancel').addEventListener('click', () => {
    document.getElementById('createLedgerModal').classList.remove('active');
});

document.getElementById('createLedgerModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        document.getElementById('createLedgerModal').classList.remove('active');
    }
});

document.getElementById('createLedgerSubmit').addEventListener('click', () => {
    const name = document.getElementById('newLedgerName').value.trim();
    if (!name) {
        showToast('Please enter a ledger name');
        return;
    }
    createSideLedger(name);
    document.getElementById('createLedgerModal').classList.remove('active');
});

// Allow Enter key to submit
document.getElementById('newLedgerName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('createLedgerSubmit').click();
    }
});

// Side ledger page
document.getElementById('sideLedgerBackBtn').addEventListener('click', closeSideLedgerPage);

document.getElementById('sideLedgerDeleteBtn').addEventListener('click', () => {
    if (confirm('Delete this side ledger and all its transactions? This cannot be undone.')) {
        deleteSideLedger(currentSideLedgerId);
    }
});

// Side ledger form
document.getElementById('sideLedgerForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = {
        amount: document.getElementById('sideLedgerAmountInput').value,
        category: document.getElementById('sideLedgerCategory').value,
        description: document.getElementById('sideLedgerDescription').value,
        date: document.getElementById('sideLedgerDate').value
    };

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
        showToast('Please enter a valid amount');
        return;
    }

    addSideLedgerTransaction(formData);

    // Reset form
    document.getElementById('sideLedgerAmountInput').value = '';
    document.getElementById('sideLedgerDescription').value = '';
    document.getElementById('sideLedgerDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('sideLedgerCategory').value = 'spent-his';
    document.getElementById('sideLedgerSpentBtn').classList.add('active');
    document.getElementById('sideLedgerReceivedBtn').classList.remove('active');

    // Refresh side ledger recommendations
    updateSideLedgerRecommendations();
    updateSideLedgerAmountRecommendations();
});

// Side ledger category buttons
document.getElementById('sideLedgerSpentBtn').addEventListener('click', () => {
    document.getElementById('sideLedgerSpentBtn').classList.add('active');
    document.getElementById('sideLedgerReceivedBtn').classList.remove('active');
    document.getElementById('sideLedgerCategory').value = 'spent-his';
});

document.getElementById('sideLedgerReceivedBtn').addEventListener('click', () => {
    document.getElementById('sideLedgerReceivedBtn').classList.add('active');
    document.getElementById('sideLedgerSpentBtn').classList.remove('active');
    document.getElementById('sideLedgerCategory').value = 'received';
});

// Side ledger clear all
document.getElementById('sideLedgerClearAllBtn').addEventListener('click', clearAllSideLedgerTransactions);

// Escape key to close overlays
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('drawerOverlay').classList.contains('active')) {
            closeDrawer();
        } else if (document.getElementById('createLedgerModal').classList.contains('active')) {
            document.getElementById('createLedgerModal').classList.remove('active');
        } else if (document.getElementById('sideLedgerPage').classList.contains('active')) {
            closeSideLedgerPage();
        }
    }
});

// Initialize side ledgers on page load
document.addEventListener('DOMContentLoaded', () => {
    renderSideLedgersList();
});

// =====================
// Register Service Worker for Offline Support
// =====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('SW registered:', registration.scope);
            })
            .catch((error) => {
                console.log('SW registration failed:', error);
            });
    });
}

// =====================
// Military Service Tracker
// =====================
const SERVICE_KEY = 'military_service_start';
const SERVICE_DAYS = 19;
const OFF_DAYS = 10;

function getServiceStartDate() {
    const stored = localStorage.getItem(SERVICE_KEY);
    return stored ? new Date(stored + 'T00:00:00') : null;
}

function saveServiceStartDate(dateStr) {
    localStorage.setItem(SERVICE_KEY, dateStr);
}

function clearServiceStartDate() {
    localStorage.removeItem(SERVICE_KEY);
}

function daysBetween(a, b) {
    // Number of whole calendar days from a to b
    const msPerDay = 24 * 60 * 60 * 1000;
    const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((bDay - aDay) / msPerDay);
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function formatServiceDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getLocalDateStr(date) {
    // Use local calendar date (not UTC) to avoid timezone day-shift bugs
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function renderServiceTracker() {
    const el = document.getElementById('serviceTracker');
    const startDate = getServiceStartDate();
    const today = new Date();

    // ── Header (always shown) ──
    const headerHtml = `
                <div class="service-tracker-header">
                    <span class="service-tracker-title">Service Tracker</span>
                    ${startDate ? `<button class="service-reset-link" id="serviceResetBtn">Reset</button>` : ''}
                </div>`;

    if (!startDate) {
        // ── IDLE STATE ──
        const todayStr = getLocalDateStr(today);
        el.innerHTML = headerHtml + `
                    <div class="service-idle">
                        <button class="service-start-btn" id="serviceStartTodayBtn">🪖 Start Service Today</button>
                        <button class="service-past-toggle" id="servicePastToggle">▾ I started a few days ago…</button>
                        <div class="service-past-picker" id="servicePastPicker">
                            <input type="date" id="servicePastDate" max="${todayStr}" value="${todayStr}">
                            <button class="service-past-confirm" id="servicePastConfirmBtn">Set</button>
                        </div>
                    </div>`;

        document.getElementById('serviceStartTodayBtn').addEventListener('click', () => {
            saveServiceStartDate(getLocalDateStr(today));
            renderServiceTracker();
        });

        document.getElementById('servicePastToggle').addEventListener('click', () => {
            const picker = document.getElementById('servicePastPicker');
            picker.classList.toggle('show');
            if (picker.classList.contains('show')) {
                document.getElementById('servicePastDate').focus();
            }
        });

        document.getElementById('servicePastConfirmBtn').addEventListener('click', () => {
            const val = document.getElementById('servicePastDate').value;
            if (!val) { showToast('Please pick a date'); return; }
            const picked = new Date(val + 'T00:00:00');
            if (picked > today) { showToast('Date cannot be in the future'); return; }
            saveServiceStartDate(val);
            renderServiceTracker();
        });

    } else {
        const dayNumber = daysBetween(startDate, today) + 1; // day 1 = start day
        const leaveDate = addDays(startDate, SERVICE_DAYS); // 20th day = departure
        const daysUntilLeave = daysBetween(today, leaveDate);

        if (dayNumber > SERVICE_DAYS) {
            // ── COMPLETE STATE ──
            const nextStartDate = addDays(startDate, SERVICE_DAYS + OFF_DAYS);
            // Calculate EOS days for display
            const eosDateRef = new Date(2026, 10, 25);
            const todayRef = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const eosDaysLeft = Math.round((eosDateRef - todayRef) / (24 * 60 * 60 * 1000));
            const eosBadgeHtml = eosDaysLeft > 0 ? `
                        <div class="service-eos-badge">
                            <span class="service-eos-badge-icon">🏁</span>
                            <span class="service-eos-badge-text"><span>${eosDaysLeft}</span> days until end of service</span>
                        </div>` : '';

            el.innerHTML = headerHtml + `
                        <div class="service-complete">
                            <div class="service-complete-badge">🎖️</div>
                            <div class="service-complete-text">Service cycle complete!</div>
                            <div class="service-complete-sub">Next cycle starts around ${formatServiceDate(nextStartDate)}</div>
                            ${eosBadgeHtml}
                        </div>`;
        } else {
            // ── ACTIVE STATE ──
            const progressPct = Math.min(100, Math.round((dayNumber / SERVICE_DAYS) * 100));
            const countdownText = daysUntilLeave === 0
                ? 'Leaving today! 🎉'
                : daysUntilLeave === 1
                    ? '1 day left'
                    : `${daysUntilLeave} days left`;

            // Calculate EOS days for display
            const eosDateRef2 = new Date(2026, 10, 25);
            const todayRef2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const eosDaysLeft2 = Math.round((eosDateRef2 - todayRef2) / (24 * 60 * 60 * 1000));
            const eosBadgeHtml2 = eosDaysLeft2 > 0 ? `
                        <div class="service-eos-badge">
                            <span class="service-eos-badge-icon">🏁</span>
                            <span class="service-eos-badge-text"><span>${eosDaysLeft2}</span> days until end of service</span>
                        </div>` : '';

            el.innerHTML = headerHtml + `
                        <div class="service-active">
                            <div class="service-day-row">
                                <div class="service-day-badge">
                                    <div class="service-day-number">${dayNumber}</div>
                                    <div class="service-day-of">of ${SERVICE_DAYS}</div>
                                </div>
                                <div class="service-info">
                                    <div class="service-leave-label">Leave date</div>
                                    <div class="service-leave-date">${formatServiceDate(leaveDate)}</div>
                                    <div class="service-leave-countdown">${countdownText}</div>
                                </div>
                            </div>
                            <div class="service-progress-bar">
                                <div class="service-progress-fill" style="width: ${progressPct}%"></div>
                            </div>
                            ${eosBadgeHtml2}
                        </div>`;
        }

        document.getElementById('serviceResetBtn').addEventListener('click', () => {
            if (confirm('Reset service tracker? This will clear your current service period.')) {
                clearServiceStartDate();
                renderServiceTracker();
            }
        });
    }
}

// Initial render
renderServiceTracker();

// =====================
// End-of-Service Countdown
// =====================
const EOS_DATE = new Date(2026, 10, 25); // 25 November 2026 (month is 0-indexed)

function renderEosCountdown() {
    const el = document.getElementById('eosCountdown');
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const eosStart = new Date(EOS_DATE.getFullYear(), EOS_DATE.getMonth(), EOS_DATE.getDate());
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.round((eosStart - todayStart) / msPerDay);

    // Collapsible header that toggles the full panel
    const toggleHeaderHtml = `
                <button class="eos-panel-toggle" id="eosPanelToggle">
                    <span class="eos-title">End of Service</span>
                    <span class="eos-panel-toggle-right">
                        <span class="eos-panel-toggle-summary" id="eosPanelSummary">${daysLeft > 0 ? daysLeft + ' days' : 'Done!'}</span>
                        <span class="eos-panel-chevron" id="eosPanelChevron">▼</span>
                    </span>
                </button>`;

    if (daysLeft <= 0) {
        // Service is done!
        el.innerHTML = toggleHeaderHtml + `
                    <div class="eos-panel-body" id="eosPanelBody">
                        <div class="eos-done">
                            <div class="eos-done-badge">🎉🪖</div>
                            <div class="eos-done-text">Military service complete!</div>
                            <div class="eos-done-sub">Finished on ${EOS_DATE.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                    </div>`;
        attachEosPanelToggle();
        return;
    }

    // Calculate progress – assume service started around 22 Nov 2025 (~12 months)
    const SERVICE_START_APPROX = new Date(2025, 10, 22);
    const totalDays = Math.round((eosStart - SERVICE_START_APPROX) / msPerDay);
    const elapsed = totalDays - daysLeft;
    const progressPct = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));

    // Build month-by-month breakdown
    const months = [];
    let cursor = new Date(todayStart);

    while (cursor < eosStart) {
        const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0); // last day of month
        const effectiveEnd = monthEnd < eosStart ? monthEnd : new Date(eosStart.getTime() - msPerDay);
        const daysInThisMonth = Math.round((effectiveEnd - monthStart) / msPerDay) + 1;

        const monthName = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const isCurrent = (cursor.getMonth() === today.getMonth() && cursor.getFullYear() === today.getFullYear());

        if (daysInThisMonth > 0) {
            months.push({ name: monthName, days: daysInThisMonth, isCurrent });
        }

        // Move to the 1st of next month
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    const monthRowsHtml = months.map(m => `
                <div class="eos-month-row${m.isCurrent ? ' current' : ''}">
                    <span class="eos-month-name">${m.name}</span>
                    <span class="eos-month-days">${m.days} day${m.days !== 1 ? 's' : ''}</span>
                </div>
            `).join('');

    el.innerHTML = toggleHeaderHtml + `
                <div class="eos-panel-body" id="eosPanelBody">
                    <div class="eos-main">
                        <div class="eos-days-number">${daysLeft}</div>
                        <div class="eos-days-label">days remaining</div>
                        <div class="eos-end-date">Service ends ${EOS_DATE.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div class="eos-progress-track">
                        <div class="eos-progress-fill" style="width: ${progressPct}%"></div>
                    </div>
                    <div class="eos-progress-labels">
                        <span>${progressPct}% done</span>
                        <span>${daysLeft} days to go</span>
                    </div>
                    <button class="eos-toggle-btn" id="eosToggleBtn">
                        <span>Monthly Breakdown</span>
                        <span class="eos-chevron">▼</span>
                    </button>
                    <div class="eos-month-breakdown" id="eosMonthBreakdown">
                        <div class="eos-month-list">
                            ${monthRowsHtml}
                        </div>
                    </div>
                </div>`;

    attachEosPanelToggle();

    // Monthly breakdown toggle
    document.getElementById('eosToggleBtn').addEventListener('click', function (e) {
        e.stopPropagation();
        const breakdown = document.getElementById('eosMonthBreakdown');
        breakdown.classList.toggle('show');
        this.classList.toggle('expanded');
    });
}

function attachEosPanelToggle() {
    document.getElementById('eosPanelToggle').addEventListener('click', function () {
        const body = document.getElementById('eosPanelBody');
        const chevron = document.getElementById('eosPanelChevron');
        body.classList.toggle('show');
        chevron.classList.toggle('expanded');
    });
}

// Initial render
renderEosCountdown();