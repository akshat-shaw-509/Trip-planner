export function payment(){
    let expenses=[]
    function addExpense(expense){
        let newExpense={
         id:Date.now(),
         user:expense.user || 'Unknown',
         category:expense.category || 'Others',
         amount:expense.amount||0,
         color:expense.color||mapCategoryToColor(expense.category),
         date:new Date()
        };
        expenses.push(newExpense)
        return newExpense
    }
    function removeExpense(id){
        expenses=expenses.filter(expense=>expense.id!==id)
    }
    function getExpenses(){
        return[...expenses]
    }
    function getTotalExpenses(){
        return expenses.reduce((total,expense)=>total+expense.amount,0)
    }
    function mapCategoryToColor(category){
        let map={
            food:'food',
            cab:'transportation',
            transport:'transportation',
            hotel:'hotel',
            hotel:'hotels',
            activity:'activities',
            activities:'activities'
        };
        return map[category?.toLowerCase()]||'others'
    }
    function getCategoryTotals(){
        let totals={}
        expenses.forEach(exp=>{
            let color=exp.color
            if(!totals[color]) totals[color]=0
            totals[color]+=exp.amount
        });
        return totals
    }
    function getExpensesByUser(user){
        return expenses.filter(exp=>exp.user===user)
    }
    function getExpensesByCategory(category){
     return expenses.filter(exp=>mapCategoryToColor(exp.category)===category)
    }
    function getUserContribution(user){
        return getExpensesByUser(user).reduce((total,exp)=>total+exp.amount,0)
    }
    function clearAllExpenses(){
        expenses=[]
    }
    return {
        addExpense,
        removeExpense,
        getExpenses,
        getTotalExpenses,
        getCategoryTotals,
        getExpensesByUser,
        getExpensesByCategory,
        getUserContribution,
        clearAllExpenses
    };
    }