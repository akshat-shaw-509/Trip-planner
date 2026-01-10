let currentTripId = null
let expenses = []
let chart = null

let initBudgetTracker = async () => {
    if (!authHandler.requireAuth()) return
    currentTripId = new URLSearchParams(window.location.search).get('id') ||
        localStorage.getItem('currentTripId')
    if (!currentTripId) {
        showToast('Select a trip first', 'error')
        setTimeout(() => window.location.href = '/trips', 2000)
        return
    }
    await Promise.all([
        loadExpenses(),
        initModal()
    ])
}

let loadExpenses = async () => {
  try {
    const response = await apiService.expenses.getByTrip(currentTripId)
    expenses = response.data || []
    displayExpenses()
    await loadExpenseSummary()
    updateChart()
  } catch (error) {
    showToast('Failed to load expenses', 'error')
  }
}

let displayExpenses = () => {
  const listEl = document.querySelector('.expense-list')
  if (!listEl) return
  listEl.innerHTML = expenses.length 
    ? expenses.map(createExpenseItem).join('')
    : '<p class="empty-state">No expenses yet</p>'
}

let createExpenseItem = (expense) => {
  return `
    <div class="expense-item ${expense.category.toLowerCase()}" data-expense-id="${expense._id}">
      <div class="expense-info">
        <div class="expense-avatar">
          <i class="fas fa-${getCategoryIcon(expense.category)}"></i>
        </div>
        <div class="expense-details">
          <div class="expense-text">${expense.description}</div>
          <div class="expense-meta">
            ${new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • 
            ${expense.category}
          </div>
        </div>
      </div>
      <div class="expense-amount">₹${expense.amount.toLocaleString()}</div>
    </div>
  `
}

let getCategoryIcon = (category) => {
  let icons = {
    accommodation: 'bed', food: 'utensils', transport: 'car',
    activities: 'skiing', shopping: 'shopping-bag', 
    entertainment: 'theater-masks', miscellaneous: 'ellipsis-h'
  }
  return icons[category] || 'receipt'
}

let loadExpenseSummary = async () => {
  try {
    let response = await apiService.expenses.getSummary(currentTripId)
    let summary = response.data
    let totalEl = document.querySelector('.total-expenditure .amount')
    if (totalEl) {
      totalEl.textContent = `₹${summary.totalAmount.toLocaleString()}`
    }
  } catch (error) {
    console.error('Summary failed:', error)
  }
}

let updateChart = () => {
  let canvas = document.getElementById('expenseChart')
  if (!canvas || typeof Chart === 'undefined') return
  let ctx = canvas.getContext('2d')
  let categoryData = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})
  if (chart) chart.destroy()
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categoryData).map(capitalize),
      datasets: [{
        data: Object.values(categoryData),
        backgroundColor: ['#ffb3e6', '#ffe6e6', '#d9b3ff', '#fff9b3', '#b3ffb3', '#b3d9ff', '#ffd9b3']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  })
}

let capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

let initModal = () => {
  let modal = document.querySelector('.modal')
  if (!modal) return
  document.querySelector('.add-expense')?.addEventListener('click', () => 
    modal.classList.add('active')
  )
  document.querySelectorAll('.close-btn, .cancel-btn')?.forEach(btn => 
    btn.addEventListener('click', () => {
      modal.classList.remove('active')
      resetForm()
    })
  )
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active')
      resetForm()
    }
  })
  document.querySelector('.submit-btn')?.addEventListener('click', handleAddExpense)
}

let handleAddExpense = async () => {
  const inputs = document.querySelectorAll('.manual-input input')
  const [paidBy, category, amountStr] = Array.from(inputs).map(i => i.value)
  const amount = parseFloat(amountStr)
  if (!paidBy || !category || !amount || amount <= 0) {
    showToast('Fill all fields with valid amount', 'error')
    return
  }
  let expenseData = {
    description: paidBy,
    category: category.toLowerCase(),
    amount,
    currency: 'INR',
    paymentMethod: 'cash',
    date: new Date().toISOString().split('T')[0]
  }
  try {
    let response = await apiService.expenses.create(currentTripId, expenseData)
    if (response.success) {
      showToast('Expense added!', 'success')
      document.querySelector('.modal').classList.remove('active')
      resetForm()
      await loadExpenses()
    }
  } catch (error) {
    showToast('Failed to add expense', 'error')
  }
}

let resetForm = () => {
  document.querySelectorAll('.manual-input input').forEach(input => input.value = '')
}

document.addEventListener('DOMContentLoaded', initBudgetTracker)