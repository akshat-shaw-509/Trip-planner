// ===================== Global State =====================
let currentTripId = null
let expenseList = []
let currentExpenseId = null
let tripBudget = 0
let categoryChart = null
let trendChart = null

// Refresh charts and analytics
function updateAnalytics() {
  renderCategoryChart()
  renderTrendChart()
  renderCategoryBreakdown()
}

// ===================== Page Init =====================
document.addEventListener('DOMContentLoaded', async () => {
  if (!authHandler.requireAuth()) return

  currentTripId =
    new URLSearchParams(window.location.search).get('id') ||
    sessionStorage.getItem('currentTripId')

  if (!currentTripId) {
    showToast('Select a trip first', 'error')
    setTimeout(() => (window.location.href = 'trips.html'), 2000)
    return
  }

  await loadTripInfo()
  await loadExpenses()
  initExpenseHandlers()
})

// ===================== Data Loading =====================
async function loadTripInfo() {
  try {
    const res = await apiService.trips.getById(currentTripId)
    const trip = res.data
    if (!trip) return

    document.getElementById('tripName').textContent = trip.title
    document.getElementById('totalBudget').textContent = `₹${(trip.budget || 0).toLocaleString()}`
    tripBudget = trip.budget || 0
  } catch (err) {
    console.error('Failed to load trip:', err)
  }
}

async function loadExpenses() {
  try {
    const res = await apiService.expenses.getByTrip(currentTripId)
    expenseList = Array.isArray(res.data) ? res.data : []

    displayExpenses()
    updateSummary()
    updateAnalytics()
  } catch (err) {
    console.error('Failed to load expenses:', err)
    showToast('Failed to load expenses', 'error')
  }
}

// ===================== Expense List =====================
function displayExpenses() {
  const listEl = document.getElementById('expensesList')
  if (!listEl) return

  let filtered = [...expenseList]

  const category = document.getElementById('categoryFilter').value
  if (category && category !== 'all') {
    filtered = filtered.filter(e => e.category === category)
  }

  const sortVal = document.getElementById('sortFilter').value
  if (sortVal) {
    const [field, order] = sortVal.split('-')
    filtered.sort((a, b) => {
      if (field === 'date') {
        const diff = new Date(a.date) - new Date(b.date)
        return order === 'asc' ? diff : -diff
      }
      if (field === 'amount') {
        return order === 'asc' ? a.amount - b.amount : b.amount - a.amount
      }
      return 0
    })
  }

  const emptyState = document.querySelector('.expenses-section .empty-state')
  if (filtered.length === 0) {
    listEl.innerHTML = ''
    if (emptyState) emptyState.style.display = 'flex'
    return
  }
  if (emptyState) emptyState.style.display = 'none'

  listEl.innerHTML = filtered.map(e => createExpenseItem(e)).join('')

  filtered.forEach(e => {
    const el = listEl.querySelector(`[data-expense-id="${e._id}"]`)
    if (el) el.onclick = () => editExpense(e)
  })
}

function createExpenseItem(exp) {
  const date = new Date(exp.date).toLocaleDateString('en-IN')

  const iconMap = {
    accommodation: 'bed',
    food: 'utensils',
    transport: 'car',
    activities: 'skiing',
    shopping: 'shopping-bag',
    entertainment: 'theater-masks',
    miscellaneous: 'ellipsis-h'
  }

  const icon = iconMap[exp.category] || 'receipt'

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
    </div>
  `
}

// ===================== Handlers =====================
function initExpenseHandlers() {
  document.getElementById('addExpenseBtn').onclick = openAddExpenseModal
  document.getElementById('closeModal').onclick = closeExpenseModal
  document.getElementById('cancelBtn').onclick = closeExpenseModal
  document.getElementById('expenseForm').onsubmit = handleExpenseSubmit

  document.getElementById('categoryFilter').onchange = displayExpenses
  document.getElementById('sortFilter').onchange = displayExpenses
}

function openAddExpenseModal() {
  currentExpenseId = null
  document.getElementById('modalTitle').textContent = 'Add Expense'
  document.getElementById('expenseForm').reset()
  document.getElementById('expenseModal').style.display = 'block'
}

function closeExpenseModal() {
  document.getElementById('expenseModal').style.display = 'none'
}

async function handleExpenseSubmit(e) {
  e.preventDefault()

  const data = {
    description: document.getElementById('expenseDescription').value.trim(),
    amount: parseFloat(document.getElementById('expenseAmount').value) || 0,
    category: document.getElementById('expenseCategory').value,
    date: document.getElementById('expenseDate').value,
    paymentMethod: document.getElementById('expensePaymentMethod').value,
    paidBy: document.getElementById('expensePaidBy').value.trim(),
    notes: document.getElementById('expenseNotes').value.trim()
  }

  try {
    if (currentExpenseId) {
      await apiService.expenses.update(currentExpenseId, data)
      showToast('Expense updated', 'success')
    } else {
      await apiService.expenses.create(currentTripId, data)
      showToast('Expense added', 'success')
    }

    closeExpenseModal()
    await loadExpenses()
  } catch (err) {
    console.error('Expense save failed:', err)
    showToast('Failed to save expense', 'error')
  }
}

function editExpense(exp) {
  currentExpenseId = exp._id
  document.getElementById('modalTitle').textContent = 'Edit Expense'

  document.getElementById('expenseDescription').value = exp.description
  document.getElementById('expenseAmount').value = exp.amount
  document.getElementById('expenseCategory').value = exp.category
  document.getElementById('expenseDate').value = exp.date.split('T')[0]
  document.getElementById('expensePaymentMethod').value = exp.paymentMethod || 'cash'
  document.getElementById('expensePaidBy').value = exp.paidBy || ''
  document.getElementById('expenseNotes').value = exp.notes || ''

  document.getElementById('expenseModal').style.display = 'block'
}

// ===================== Summary =====================
function updateSummary() {
  const totalSpent = expenseList.reduce((sum, e) => sum + e.amount, 0)
  const remaining = tripBudget - totalSpent
  const avg = expenseList.length ? totalSpent / expenseList.length : 0
  const percent = tripBudget ? Math.min((totalSpent / tripBudget) * 100, 100) : 0

  document.getElementById('totalSpent').textContent = `₹${totalSpent.toLocaleString()}`
  document.getElementById('remaining').textContent = `₹${Math.max(remaining, 0).toLocaleString()}`
  document.getElementById('dailyAverage').textContent = `₹${avg.toFixed(2)}`

  const progress = document.getElementById('spentProgress')
  const percentText = document.getElementById('spentPercentage')
  if (progress) progress.style.width = `${percent}%`
  if (percentText) percentText.textContent = `${percent.toFixed(1)}% of budget`
}

// ===================== Utils =====================
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ===================== Charts =====================
function renderCategoryChart() {
  const ctx = document.getElementById('categoryChart')
  if (!ctx) return

  const totals = {}
  expenseList.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + e.amount
  })

  if (categoryChart) categoryChart.destroy()
  categoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(totals),
      datasets: [{ data: Object.values(totals) }]
    }
  })
}

function renderTrendChart() {
  const ctx = document.getElementById('trendChart')
  if (!ctx) return

  const daily = {}
  expenseList.forEach(e => {
    const date = new Date(e.date).toLocaleDateString()
    daily[date] = (daily[date] || 0) + e.amount
  })

  const labels = Object.keys(daily).sort((a, b) => new Date(a) - new Date(b))
  const data = labels.map(d => daily[d])

  if (trendChart) trendChart.destroy()
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Daily Spending',
        data,
        fill: false,
        tension: 0.3
      }]
    }
  })
}

function renderCategoryBreakdown() {
  const container = document.getElementById('categoryBreakdown')
  if (!container) return

  const totals = {}
  expenseList.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + e.amount
  })

  container.innerHTML = Object.entries(totals)
    .map(([cat, amt]) => `
      <div class="breakdown-item">
        <span>${capitalizeFirst(cat)}</span>
        <span>₹${amt.toLocaleString()}</span>
      </div>
    `)
    .join('')
}