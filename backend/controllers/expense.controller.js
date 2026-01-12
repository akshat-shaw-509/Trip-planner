let expenseService = require('../services/expense.service');

let sendSuccess=(res,statusCode,data=null,message=null,extra={})=>{
    let response={ success:true }
    if(data) response.data=data
    if(message) response.message=message
    Object.assign(response,extra)
    res.status(statusCode).json(response)
}

let sendError=(res,statusCode,message)=>{
    res.status(statusCode).json({success:false,message})
}

let createExpense = async (req, res) => {
    let expense = await expenseService.createExpense(req.params.tripId, req.body, req.user.id)
    sendSuccess(res,201,expense,'Expense created successfully')
}

let getExpensesByTrip = async (req, res) => {
  let filters={
    category: req.query.category,
    paymentMethod: req.query.paymentMethod,
    startDate: req.query.startDate,
    endDate: req.query.endDate,  
}
    let expenses = await expenseService.getExpensesByTrip(req.params.tripId, req.user.id, filters);
    sendSuccess(res,200,expenses,null,{count: expenses.length })   
}

let getExpenseById = async (req, res) => {
    let expense=await expenseService.getExpenseById(req.params.expenseId, req.user.id)
    sendSuccess(res,200,expense) 
}

let updateExpense = async (req, res) => {
    let expense = await expenseService.updateExpense(req.params.expenseId, req.body, req.user.id);
    sendSuccess(res, 200, expense, 'Expense updated successfully');
}

let deleteExpense = async (req, res) => {
  const result = await expenseService.deleteExpense(req.params.expenseId, req.user.id)
  sendSuccess(res, 200, null, result.message)
}

let getTripExpenseSummary = async (req, res) => {
  let summary = await expenseService.getTripExpenseSummary(req.params.tripId, req.user.id)
  sendSuccess(res, 200, summary)
}

let getExpensesByCategory = async (req, res) => {
    let expenses = await expenseService.getExpensesByCategory(req.params.tripId, req.user.id)
  sendSuccess(res, 200, expenses) 
}

const attachReceipt = async (req, res) => {
  if (!req.body.receiptUrl) {
    return sendError(res, 400, 'Receipt URL required')
  }
  let expense = await expenseService.attachReceipt(req.params.expenseId, req.body.receiptUrl, req.user.id)
  sendSuccess(res, 200, expense, 'Receipt attached successfully')
}

module.exports = {
  createExpense,
  getExpensesByTrip,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getTripExpenseSummary,
  getExpensesByCategory,
  attachReceipt,
}
