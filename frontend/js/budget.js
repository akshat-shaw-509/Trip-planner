let currentTripId = null;
let expenseList = [];
let currentExpenseId = null;
let tripBudget = 0;
let categoryChart = null;
let trendChart = null;


function updateAnalytics() {
    renderCategoryChart();
    renderTrendChart();
    renderCategoryBreakdown();
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (!authHandler.requireAuth()) return;
    currentTripId = new URLSearchParams(window.location.search).get('id') || localStorage.getItem('currentTripId');
    if (!currentTripId) {
        showToast('Select a trip first', 'error');
        setTimeout(() => window.location.href = 'trips.html', 2000);
        return;
    }
    await loadTripInfo();
    await loadExpenses();
    initExpenseHandlers();
});

async function loadTripInfo() {
    try {
        const res = await apiService.trips.getById(currentTripId);
        const trip = res.data;
        if (trip) {
            document.getElementById('tripName').textContent = trip.title;
            document.getElementById('totalBudget').textContent = `₹${trip.budget?.toLocaleString() || 0}`;
            tripBudget = trip.budget || 0;
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadExpenses() {
    try {
        const res = await apiService.expenses.getByTrip(currentTripId);
       expenseList = Array.isArray(res.data) ? res.data : [];
        displayExpenses();
        updateSummary();
        updateAnalytics();
    } catch (err) {
        console.error('Failed to load expenses', err);
        showToast('Failed to load expenses', 'error');
    }
}

function displayExpenses() {
    const listEl = document.getElementById('expensesList');
    if (!listEl) return;
    // Apply category filter
    const cat = document.getElementById('categoryFilter').value;
    let filtered = expenseList;
    if (cat && cat !== 'all') {
        filtered = filtered.filter(e => e.category === cat);
    }
    // Apply sorting
    const sortVal = document.getElementById('sortFilter').value;
    if (sortVal) {
        const [field, order] = sortVal.split('-');
        filtered.sort((a,b) => {
            if (field === 'date') {
                const diff = new Date(a.date) - new Date(b.date);
                return order==='asc' ? diff : -diff;
            }
            if (field === 'amount') {
                return order==='asc' ? a.amount - b.amount : b.amount - a.amount;
            }
            return 0;
        });
    }
    // Render
    if (filtered.length === 0) {
        listEl.innerHTML = '';
        document.querySelector('.expenses-section .empty-state').style.display = 'flex';
        return;
    }
    document.querySelector('.expenses-section .empty-state').style.display = 'none';
    listEl.innerHTML = filtered.map(e => createExpenseItem(e)).join('');
    // Attach click for edit
    filtered.forEach(e => {
        const el = listEl.querySelector(`[data-expense-id="${e._id}"]`);
        if (el) {
            el.onclick = () => editExpense(e);
        }
    });
}

function createExpenseItem(exp) {
    const date = new Date(exp.date).toLocaleDateString();
    const iconMap = {
        accommodation: 'bed', food: 'utensils', transport: 'car',
        activities: 'skiing', shopping: 'shopping-bag',
        entertainment: 'theater-masks', miscellaneous: 'ellipsis-h'
    };
    const icon = iconMap[exp.category] || 'receipt';
    return `
      <div class="expense-item ${exp.category}" data-expense-id="${exp._id}">
        <div class="expense-info">
          <div class="expense-avatar"><i class="fas fa-${icon}"></i></div>
          <div class="expense-details">
            <div class="expense-text">${escapeHtml(exp.description)}</div>
            <div class="expense-meta">
              ${date} • ${capitalizeFirst(exp.category)}
              ${exp.paidBy ? `• Paid by ${escapeHtml(exp.paidBy)}` : ''}
            </div>
          </div>
        </div>
        <div class="expense-amount">₹${exp.amount.toLocaleString()}</div>
      </div>`;
}

function initExpenseHandlers() {
    // Open/close modal
    document.getElementById('addExpenseBtn').onclick = openAddExpenseModal;
    document.getElementById('closeModal').onclick = closeExpenseModal;
    document.getElementById('cancelBtn').onclick = closeExpenseModal;
    document.getElementById('expenseForm').onsubmit = handleExpenseSubmit;
    // Filter/sort
    document.getElementById('categoryFilter').onchange = displayExpenses;
    document.getElementById('sortFilter').onchange = displayExpenses;
}

function openAddExpenseModal() {
    currentExpenseId = null;
    document.getElementById('modalTitle').textContent = 'Add Expense';
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseModal').style.display = 'block';
}

function closeExpenseModal() {
    document.getElementById('expenseModal').style.display = 'none';
}

async function handleExpenseSubmit(e) {
    e.preventDefault();
    const data = {
        description: document.getElementById('expenseDescription').value.trim(),
        amount: parseFloat(document.getElementById('expenseAmount').value) || 0,
        category: document.getElementById('expenseCategory').value,
        date: document.getElementById('expenseDate').value,
        paymentMethod: document.getElementById('expensePaymentMethod').value,
        paidBy: document.getElementById('expensePaidBy').value.trim(),
        notes: document.getElementById('expenseNotes').value.trim()
    };
    
    // 🔍 DEBUG: Log the data being sent
    console.log('📤 Submitting expense data:', JSON.stringify(data, null, 2));
    console.log('Trip ID:', currentTripId);
    console.log('Is Update?:', !!currentExpenseId);
    
    try {
        if (currentExpenseId) {
            const result = await apiService.expenses.update(currentExpenseId, data);
            console.log('✅ Update successful:', result);
            showToast('Expense updated', 'success');
        } else {
            const result = await apiService.expenses.create(currentTripId, data);
            console.log('✅ Create successful:', result);
            showToast('Expense added', 'success');
        }
        closeExpenseModal();
        await loadExpenses();
    } catch (err) {
        // 🔍 ENHANCED ERROR LOGGING
        console.error('❌ Saving expense failed:', err);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        
        // Try to get validation errors
        if (err.validationErrors) {
            console.error('Validation errors:', err.validationErrors);
            const errorMessages = err.validationErrors.map(e => `${e.field}: ${e.message}`).join('\n');
            showToast(`Validation failed:\n${errorMessages}`, 'error');
        } else if (err.response?.data) {
            console.error('Response data:', err.response.data);
            showToast(err.response.data.message || 'Failed to save expense', 'error');
        } else {
            showToast('Failed to save expense', 'error');
        }
    }
}

function editExpense(exp) {
    currentExpenseId = exp._id;
    document.getElementById('modalTitle').textContent = 'Edit Expense';
    document.getElementById('expenseDescription').value = exp.description;
    document.getElementById('expenseAmount').value = exp.amount;
    document.getElementById('expenseCategory').value = exp.category;
    document.getElementById('expenseDate').value = exp.date.split('T')[0];
    document.getElementById('expensePaymentMethod').value = exp.paymentMethod || 'cash';
    document.getElementById('expensePaidBy').value = exp.paidBy || '';
    document.getElementById('expenseNotes').value = exp.notes || '';
    document.getElementById('expenseModal').style.display = 'block';
}

function updateSummary() {
    const total = expenseList.reduce((sum,e) => sum + e.amount, 0);
    const remaining = tripBudget - total;
    const avg = expenseList.length ? (total / expenseList.length) : 0;

    const percent = tripBudget > 0 ? Math.min((total / tripBudget) * 100, 100) : 0;

    document.getElementById('totalSpent').textContent = `₹${total.toLocaleString()}`;
    document.getElementById('remaining').textContent = `₹${Math.max(remaining, 0).toLocaleString()}`;
    document.getElementById('dailyAverage').textContent = `₹${avg.toFixed(2)}`;

    const progress = document.getElementById('spentProgress');
    const percentText = document.getElementById('spentPercentage');

    if (progress) {
        progress.style.width = `${percent}%`;
    }

    if (percentText) {
        percentText.textContent = `${percent.toFixed(1)}% of budget`;
    }
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateAnalytics() {
    renderCategoryChart();
    renderTrendChart();
    renderCategoryBreakdown();
}

function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const totals = {};
    expenseList.forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

    const labels = Object.keys(totals);
    const data = Object.values(totals);

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
            }]
        }
    });
}

function renderTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    const dailyTotals = {};
    expenseList.forEach(e => {
        const d = new Date(e.date).toLocaleDateString();
        dailyTotals[d] = (dailyTotals[d] || 0) + e.amount;
    });

    const labels = Object.keys(dailyTotals).sort((a,b) => new Date(a) - new Date(b));
    const data = labels.map(l => dailyTotals[l]);

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Daily Spend',
                data,
                fill: false,
                tension: 0.3
            }]
        }
    });
}

function renderCategoryBreakdown() {
    const container = document.getElementById('categoryBreakdown');
    if (!container) return;

    const totals = {};
    expenseList.forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

    container.innerHTML = Object.entries(totals).map(([cat, amt]) => `
        <div class="breakdown-item">
            <span>${capitalizeFirst(cat)}</span>
            <span>₹${amt.toLocaleString()}</span>
        </div>
    `).join('');
}