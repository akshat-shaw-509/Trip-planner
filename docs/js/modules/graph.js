// graph.js - Chart visualization module without OOP

let canvas = null;
let ctx = null;
let chartData = null;

const colors = {
    'Food': '#d946ef',
    'Transportation': '#ef4444',
    'Hotels': '#22c55e',
    'Activities': '#3b82f6',
    'Others': '#eab308'
};

export function initChartManager() {
    canvas = document.getElementById('expenseChart');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!canvas) return;

    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth, 400);
    canvas.width = size;
    canvas.height = size;

    if (chartData) {
        drawChart(chartData);
    }
}

export function updateChart(categoryTotals) {
    chartData = categoryTotals;
    drawChart(categoryTotals);
}

function drawChart(categoryTotals) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.7;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const total = Object.values(categoryTotals)
        .reduce((sum, val) => sum + val, 0);

    if (total === 0) {
        drawEmptyState(centerX, centerY);
        return;
    }

    let currentAngle = -Math.PI / 2;

    Object.entries(categoryTotals).forEach(([category, amount]) => {
        const sliceAngle = (amount / total) * 2 * Math.PI;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[category] || '#999';
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        currentAngle += sliceAngle;
    });

    drawLabels(categoryTotals, total, centerX, centerY, radius);
}

function drawLabels(categoryTotals, total, centerX, centerY, radius) {
    const labelRadius = radius + 60;
    let currentAngle = -Math.PI / 2;

    Object.entries(categoryTotals).forEach(([category, amount]) => {
        const sliceAngle = (amount / total) * 2 * Math.PI;
        const midAngle = currentAngle + sliceAngle / 2;

        const x = centerX + Math.cos(midAngle) * labelRadius;
        const y = centerY + Math.sin(midAngle) * labelRadius;

        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(category, x, y);

        currentAngle += sliceAngle;
    });
}

function drawEmptyState(centerX, centerY) {
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 100, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#999';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No expenses yet', centerX, centerY);
}

export function getChartData() {
    return chartData;
}
