// Handles expense listing, creation, editing, filtering, and export

(function () {
  'use strict';

  // Prevent double initialization
  if (window.expensesPageLoaded) {
    console.warn('Expenses page already loaded');
    return;
  }
  window.expensesPageLoaded = true;

  // ===================== State =====================
  let tripId = null;
  let expenses = [];
  let currentFilter = 'all';
  let currentExpenseId = null;

  // ===================== Init =====================
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing expenses page');

    // Basic auth check
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      showToast('Please log in to continue', 'error');
      setTimeout(() => (window.location.href = 'login.html'), 1500);
      return;
    }

    // Extract trip ID from URL
    const params = new URLSearchParams(window.location.search);
    tripId = params.get('id');

    if (!tripId) {
      showToast('Trip not found', 'error');
      setTimeout(() => (window.location.href = 'trips.html'), 1500);
      return;
    }

    try {
      await loadExpenses();
      setupEventListeners();
      console.log('Expenses page ready');
    } catch (err) {
      console.error('Initialization failed:', err);
      showToast('Failed to load expenses', 'error');
    }
  });

  // ===================== Event Binding =====================
  function setupEventListeners() {
    // Add expense buttons
    document
      .querySelectorAll('.btn-add-expense')
      .forEach(btn => (btn.onclick = openAddExpenseModal));

    // Modal controls
    document.getElementById('closeModal')?.addEventListener('click', closeExpenseModal);
    document.getElementById('cancelBtn')?.addEventListener('click', closeExpenseModal);
    document.getElementById('expenseForm')?.addEventListener('submit', handleSubmitExpense);

    // Close modal on backdrop click
    const modal = document.getElementById('expenseModal');
    if (modal) {
      modal.onclick = e => {
        if (e.target.id === 'expenseModal') closeExpenseModal();
      };
    }

    // Category filters
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.onclick = () => handleFilterChange(btn.dataset.category);
    });

    // Export CSV
    document.querySelector('.btn-export')?.addEventListener('click', exportExpenses);
  }

  // ===================== Data =====================
  async function loadExpenses() {
    try {
      const res = await apiService.expenses.getByTrip(tripId);
      expenses = Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('Failed to load expenses:', err);
      expenses = [];
    }

    renderExpenses();
    updateSummary();
  }

  // ===================== Rendering =====================
  function renderExpenses() {
    const list = document.getElementById('expensesList');
    const emptyState = document.querySelector('.empty-state');
    if (!list) return;

    const filtered = expenses.filter(e =>
      currentFilter === 'all' ? true : e.category === currentFilter
    );

    if (filtered.length === 0) {
      list.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    list.innerHTML = filtered.map(createExpenseCard).join('');

    // Enable edit on click
    filtered.forEach(exp => {
      const card = document.querySelector(`[data-expense-id="${exp._id}"]`);
      if (card) card.onclick = () => editExpense(exp);
    });
  }

  function createExpenseCard(expense) {
    const date = new Date(expense.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const icons = {
      accommodation: 'bed',
      food: 'utensils',
      transport: 'car',
      activities: 'skiing',
      shopping: 'shopping-bag',
      entertainment: 'theater-masks',
      miscellaneous: 'ellipsis-h'
    };

    const icon = icons[expense.category] || 'receipt';

    return `
      <div class="expense-item ${expense.category}" data-expense-id="${expense._id}">
        <div class="expense-info">
          <div class="expense-avatar">
            <i class="fas fa-${icon}"></i>
          </div>
          <div class="expense-details">
            <div class="expense-text">${escapeHtml(expense.description)}</div>
            <div class="expense-meta">
              ${date} • ${capitalizeFirst(expense.category)}
              ${expense.paidBy ? ` • Paid by ${escapeHtml(expense.paidBy)}` : ''}
            </div>
          </div>
        </div>
        <div class="expense-amount">₹${expense.amount.toLocaleString()}</div>
      </div>
    `;
  }

  // ===================== Summary =====================
  function updateSummary() {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    document.getElementById('totalSpent').textContent = `₹${total.toLocaleString()}`;
    document.getElementById('transactionCount').textContent = expenses.length;

    updateBudgetInfo();
  }

  async function updateBudgetInfo() {
    try {
      const res = await apiService.trips.getById(tripId);
      const trip = res.data;
      if (!trip?.budget) return;

      const spent = expenses.reduce((s, e) => s + e.amount, 0);
      const remaining = trip.budget - spent;

      document.getElementById('budgetAmount').textContent =
        `₹${trip.budget.toLocaleString()}`;

      const remainingEl = document.getElementById('remainingAmount');
      remainingEl.textContent = `₹${remaining.toLocaleString()}`;
      remainingEl.style.color = remaining < 0 ? '#ef4444' : '#4caf50';
    } catch (err) {
      console.error('Budget fetch failed:', err);
    }
  }

  // ===================== Modal =====================
  function openAddExpenseModal() {
    currentExpenseId = null;

    document.getElementById('modalTitle').textContent = 'Add Expense';
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').value =
      new Date().toISOString().split('T')[0];

    document.getElementById('expenseModal').classList.add('active');
  }

  function editExpense(expense) {
    currentExpenseId = expense._id;

    document.getElementById('modalTitle').textContent = 'Edit Expense';
    document.getElementById('expenseDescription').value = expense.description;
    document.getElementById('expenseAmount').value = expense.amount;
    document.getElementById('expenseCategory').value = expense.category;
    document.getElementById('expenseDate').value = expense.date.split('T')[0];
    document.getElementById('expensePaymentMethod').value =
      expense.paymentMethod || 'cash';
    document.getElementById('expensePaidBy').value = expense.paidBy || '';
    document.getElementById('expenseNotes').value = expense.notes || '';

    document.getElementById('expenseModal').classList.add('active');
  }

  function closeExpenseModal() {
    document.getElementById('expenseModal')?.classList.remove('active');
    currentExpenseId = null;
  }

  // ===================== Save =====================
  async function handleSubmitExpense(e) {
    e.preventDefault();

    const data = {
      description: document.getElementById('expenseDescription').value.trim(),
      amount: parseFloat(document.getElementById('expenseAmount').value),
      category: document.getElementById('expenseCategory').value,
      date: document.getElementById('expenseDate').value,
      paymentMethod: document.getElementById('expensePaymentMethod').value,
      paidBy: document.getElementById('expensePaidBy').value.trim(),
      notes: document.getElementById('expenseNotes').value.trim(),
      currency: 'INR'
    };

    if (!data.description || !data.amount || !data.category || !data.date) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (data.amount <= 0) {
      showToast('Amount must be greater than zero', 'error');
      return;
    }

    try {
      if (currentExpenseId) {
        await apiService.expenses.update(currentExpenseId, data);
        showToast('Expense updated', 'success');
      } else {
        await apiService.expenses.create(tripId, data);
        showToast('Expense added', 'success');
      }

      closeExpenseModal();
      await loadExpenses();
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Failed to save expense', 'error');
    }
  }

  // ===================== Filters =====================
  function handleFilterChange(category) {
    currentFilter = category;

    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    renderExpenses();
  }

  // ===================== Export =====================
  function exportExpenses() {
    if (!expenses.length) {
      showToast('No expenses to export', 'info');
      return;
    }

    const headers = [
      'Date',
      'Description',
      'Category',
      'Amount',
      'Payment Method',
      'Paid By',
      'Notes'
    ];

    const rows = expenses.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.description,
      e.category,
      e.amount,
      e.paymentMethod || '',
      e.paidBy || '',
      e.notes || ''
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(r => {
      csv += r.map(v => `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Expenses exported', 'success');
  }

  // ===================== Utils =====================
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function showToast(message, type = 'info') {
    window.showToast ? window.showToast(message, type) : alert(message);
  }

  console.log('Expenses module loaded');
})();
