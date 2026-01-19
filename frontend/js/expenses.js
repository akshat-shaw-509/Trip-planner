// expenses.js - Complete Expense Management
(function() {
    'use strict';
    
    if (window.expensesPageLoaded) {
        console.warn('Expenses page already loaded');
        return;
    }
    window.expensesPageLoaded = true;

    let tripId = null;
    let expenses = [];
    let currentFilter = 'all';
    let currentExpenseId = null;

    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 Expenses page initializing...');
        
        // Check auth
        const token = localStorage.getItem('accessToken');
        if (!token) {
            showToast('Please log in to continue', 'error');
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }

        // Get trip ID
        const urlParams = new URLSearchParams(window.location.search);
        tripId = urlParams.get('id');

        if (!tripId) {
            showToast('Trip not found', 'error');
            setTimeout(() => window.location.href = 'trips.html', 1500);
            return;
        }

        try {
            await loadExpenses();
            setupEventListeners();
            console.log('✅ Expenses page loaded');
        } catch (error) {
            console.error('❌ Init error:', error);
            showToast('Failed to initialize: ' + error.message, 'error');
        }
    });

    function setupEventListeners() {
        // Add expense buttons
        const addBtns = document.querySelectorAll('.btn-add-expense');
        addBtns.forEach(btn => btn.onclick = openAddExpenseModal);

        // Modal controls
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const expenseForm = document.getElementById('expenseForm');
        
        if (closeModal) closeModal.onclick = closeExpenseModal;
        if (cancelBtn) cancelBtn.onclick = closeExpenseModal;
        if (expenseForm) expenseForm.onsubmit = handleSubmitExpense;

        // Close modal on outside click
        const modal = document.getElementById('expenseModal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target.id === 'expenseModal') {
                    closeExpenseModal();
                }
            };
        }

        // Category filters
        const categoryBtns = document.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.onclick = () => handleFilterChange(btn.dataset.category);
        });

        // Export button
        const exportBtn = document.querySelector('.btn-export');
        if (exportBtn) exportBtn.onclick = exportExpenses;
    }

    async function loadExpenses() {
        try {
            console.log('📥 Fetching expenses...');
            const response = await window.apiService.expenses.getByTrip(tripId);
            
            expenses = response.data || [];
            console.log(`✅ Loaded ${expenses.length} expenses`);
            
            renderExpenses();
            updateSummary();
            
        } catch (error) {
            console.error('⚠️ Error loading expenses:', error);
            expenses = [];
            renderExpenses();
            updateSummary();
        }
    }

    function renderExpenses() {
        const list = document.getElementById('expensesList');
        const emptyState = document.querySelector('.empty-state');
        
        if (!list) {
            console.error('❌ Expenses list element not found');
            return;
        }

        // Filter expenses
        let filtered = expenses.filter(expense => {
            if (currentFilter === 'all') return true;
            return expense.category === currentFilter;
        });

        console.log(`📊 Rendering ${filtered.length} expenses (filter: ${currentFilter})`);

        // Show empty state
        if (filtered.length === 0) {
            list.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Render expense cards
        list.innerHTML = filtered.map(expense => createExpenseCard(expense)).join('');

        // Add click handlers
        filtered.forEach(expense => {
            const card = document.querySelector(`[data-expense-id="${expense._id}"]`);
            if (card) {
                card.onclick = () => editExpense(expense);
            }
        });
    }

    function createExpenseCard(expense) {
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const categoryIcons = {
            accommodation: 'bed',
            food: 'utensils',
            transport: 'car',
            activities: 'skiing',
            shopping: 'shopping-bag',
            entertainment: 'theater-masks',
            miscellaneous: 'ellipsis-h'
        };

        const icon = categoryIcons[expense.category] || 'receipt';

        return `
            <div class="expense-item ${expense.category}" data-expense-id="${expense._id}">
                <div class="expense-info">
                    <div class="expense-avatar">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="expense-details">
                        <div class="expense-text">${escapeHtml(expense.description)}</div>
                        <div class="expense-meta">
                            ${formattedDate} • ${capitalizeFirst(expense.category)}
                            ${expense.paidBy ? ` • Paid by ${escapeHtml(expense.paidBy)}` : ''}
                        </div>
                    </div>
                </div>
                <div class="expense-amount">₹${expense.amount.toLocaleString()}</div>
            </div>
        `;
    }

    function updateSummary() {
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        const count = expenses.length;

        const totalEl = document.getElementById('totalSpent');
        const countEl = document.getElementById('transactionCount');
        
        if (totalEl) totalEl.textContent = `₹${total.toLocaleString()}`;
        if (countEl) countEl.textContent = count;

        // Update budget and remaining (if trip data available)
        updateBudgetInfo();
    }

    async function updateBudgetInfo() {
        try {
            const tripResponse = await window.apiService.trips.getById(tripId);
            const trip = tripResponse.data;
            
            if (trip.budget) {
                const total = expenses.reduce((sum, e) => sum + e.amount, 0);
                const remaining = trip.budget - total;
                
                const budgetEl = document.getElementById('budgetAmount');
                const remainingEl = document.getElementById('remainingAmount');
                
                if (budgetEl) budgetEl.textContent = `₹${trip.budget.toLocaleString()}`;
                if (remainingEl) {
                    remainingEl.textContent = `₹${remaining.toLocaleString()}`;
                    remainingEl.style.color = remaining < 0 ? '#ef4444' : '#4caf50';
                }
            }
        } catch (error) {
            console.error('⚠️ Failed to load budget info:', error);
        }
    }

    function openAddExpenseModal() {
        currentExpenseId = null;
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('expenseForm');
        
        if (modalTitle) modalTitle.textContent = 'Add Expense';
        if (form) form.reset();
        
        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('expenseDate');
        if (dateInput) dateInput.value = today;

        const modal = document.getElementById('expenseModal');
        if (modal) modal.classList.add('active');
    }

    function editExpense(expense) {
        currentExpenseId = expense._id;
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Edit Expense';

        // Fill form
        document.getElementById('expenseDescription').value = expense.description;
        document.getElementById('expenseAmount').value = expense.amount;
        document.getElementById('expenseCategory').value = expense.category;
        document.getElementById('expenseDate').value = expense.date.split('T')[0];
        document.getElementById('expensePaymentMethod').value = expense.paymentMethod || 'cash';
        document.getElementById('expensePaidBy').value = expense.paidBy || '';
        document.getElementById('expenseNotes').value = expense.notes || '';

        const modal = document.getElementById('expenseModal');
        if (modal) modal.classList.add('active');
    }

    function closeExpenseModal() {
        const modal = document.getElementById('expenseModal');
        if (modal) modal.classList.remove('active');
        currentExpenseId = null;
    }

    async function handleSubmitExpense(e) {
        e.preventDefault();

        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const date = document.getElementById('expenseDate').value;
        const paymentMethod = document.getElementById('expensePaymentMethod').value;
        const paidBy = document.getElementById('expensePaidBy').value.trim();
        const notes = document.getElementById('expenseNotes').value.trim();

        if (!description || !amount || !category || !date) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        if (amount <= 0) {
            showToast('Amount must be greater than 0', 'error');
            return;
        }

        const expenseData = {
            description,
            amount,
            category,
            date,
            paymentMethod,
            paidBy,
            notes,
            currency: 'INR'
        };

        try {
            if (currentExpenseId) {
                await window.apiService.expenses.update(currentExpenseId, expenseData);
                showToast('Expense updated successfully', 'success');
            } else {
                await window.apiService.expenses.create(tripId, expenseData);
                showToast('Expense added successfully', 'success');
            }

            closeExpenseModal();
            await loadExpenses();
        } catch (error) {
            console.error('❌ Error saving expense:', error);
            showToast(error.message || 'Failed to save expense', 'error');
        }
    }

    function handleFilterChange(category) {
        currentFilter = category;

        // Update active button
        const categoryBtns = document.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        renderExpenses();
    }

    function exportExpenses() {
        if (expenses.length === 0) {
            showToast('No expenses to export', 'info');
            return;
        }

        // Create CSV content
        const headers = ['Date', 'Description', 'Category', 'Amount', 'Payment Method', 'Paid By', 'Notes'];
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
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        showToast('Expenses exported successfully', 'success');
    }

    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }

    console.log('✅ Expenses module loaded');
})();