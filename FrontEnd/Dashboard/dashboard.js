// dashboard.js - Fixed version with proper authentication handling
const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : 'http://localhost:5000';

// Determine the directory of this script so mock data can be loaded
const SCRIPT_BASE = (() => {
    try {
        const script = document.currentScript || document.querySelector('script[src*="dashboard.js"]');
        return script ? script.src.replace(/[^/]+$/, '') : '';
    } catch (e) {
        return '';
    }
})();  
document.addEventListener('DOMContentLoaded', function() {
    // Add a small delay to ensure token is stored after redirect
    setTimeout(() => {
        const token = localStorage.getItem('authToken');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');

        if (!token) {
            console.log('No auth token found, redirecting to login...');
            window.location.href = '/index.html';
            return;
        }

        // Verify the token is actually valid (not just present)
        verifyToken(token).then(isValid => {
            if (!isValid) {
                console.log('Invalid token, redirecting to login...');
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/index.html';
                return;
            }
            
            // Only initialize dashboard if token is valid
            initializeDashboardComponents(token, userData);
        });
    }, 100); // 100ms delay to ensure storage operations complete
});

// Function to verify token with server
async function verifyToken(token) {
    try {
        const response = await fetch(`${API_BASE}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return false;
        
        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('Token verification failed:', error);
        return false;
    }
}

// Initialize all dashboard components
function initializeDashboardComponents(token, userData) {
    // Display username
    const usernameElement = document.getElementById('username-display');
    if (usernameElement && userData.username) {
        usernameElement.textContent = userData.username;
    }

    // Sidebar toggle
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    if (sidebarCollapse && sidebar && main) {
        sidebarCollapse.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            main.classList.toggle('active');
        });
    }

    // Init dashboard
    initializeDashboard(token);

    // Chart period buttons (separate for Overview vs Types)
    document.querySelectorAll('.chart-card').forEach(card => {
        const title = card.querySelector('h3')?.textContent || '';
        const buttons = card.querySelectorAll('.chart-period button');

        buttons.forEach(button => {
            button.addEventListener('click', function() {
                buttons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                const period = this.dataset.period;

                if (title.includes('Overview')) {
                    updateCharts(period, token); // line chart only
                } else if (title.includes('Types')) {
                    updateIncidentTypes(period, token); // bar chart only
                }
            });
        });
    });

    // Logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            initializeDashboard(token);
        });
    }

    // Auto-refresh every 5 mins
    setInterval(() => {
        const token = localStorage.getItem('authToken');
        if (token) initializeDashboard(token);
    }, 5 * 60 * 1000);
}

// Dashboard initialization function
async function initializeDashboard(token) {
    try {
        showLoadingState(true);

        console.log('🔄 Fetching local mock data...');

        const [statsData, chartsData, activityData, notificationsData] = await Promise.all([
            fetchDashboardStats(),
            fetchDashboardCharts('week'), // default load week
            fetchRecentActivity(),
            fetchNotifications()
        ]);

        console.log('✅ Data received:', {
            stats: statsData ? 'Received' : 'Failed',
            charts: chartsData ? 'Received' : 'Failed',
            activity: activityData ? 'Received' : 'Failed',
            notifications: notificationsData ? 'Received' : 'Failed'
        });

        updateStats(statsData);
        initCharts(chartsData);
        updateActivity(activityData);
        updateNotifications(notificationsData);

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('Failed to load dashboard data.');
    } finally {
        showLoadingState(false);
    }
}

// ---------------- Mock API Functions ----------------
async function fetchDashboardStats() {
    try {
        const response = await fetch('./mock_api/dashboard-stats.json');
        const data = await response.json();
        return data.data;
    } catch (err) {
        console.error('❌ Error loading stats:', err);
        return null;
    }
}

async function fetchDashboardCharts(period = 'week') {
    try {
        const response = await fetch('./mock_api/dashboard-charts.json');
        const data = await response.json();

        if (period === 'day') return data.data.daily;
        if (period === 'month') return data.data.monthly;
        return data.data.weekly;
    } catch (err) {
        console.error('❌ Error loading charts:', err);
        return null;
    }
}

async function fetchRecentActivity() {
    try {
        const response = await fetch('./mock_api/dashboard-activity.json');
        const data = await response.json();
        return data.data?.activity || [];
    } catch (err) {
        console.error('❌ Error loading activity:', err);
        return [];
    }
}

async function fetchNotifications() {
    try {
        const response = await fetch('./mock_api/notifications.json');
        const data = await response.json();
        return data.data || [];
    } catch (err) {
        console.error('❌ Error loading notifications:', err);
        return [];
    }
}

// ---------------- UI Update Functions ----------------
function updateStats(data) {
    if (!data || !data.overview) {
        console.error('❌ No stats data received');
        showError('Could not load dashboard statistics.');
        return;
    }
    
    const stats = data.overview;
    console.log('🔄 Updating stats:', stats);

    const statElements = [
        { selector: '.stats-card:nth-child(1) h2', value: stats.activeUsers || 0 },
        { selector: '.stats-card:nth-child(2) h2', value: stats.totalIncidents || 0 },
        { selector: '.stats-card:nth-child(3) h2', value: stats.activeOfficers || 0 },
        { selector: '.stats-card:nth-child(4) h2', value: stats.newMessages || 0 }
    ];

    statElements.forEach(stat => {
        const el = document.querySelector(stat.selector);
        if (el) animateValue(el, 0, stat.value, 1000);
    });

    if (stats.trends) {
        const changeElements = [
            { selector: '.stats-card:nth-child(1) .stats-card-change', value: stats.trends.activeUsers || 0 },
            { selector: '.stats-card:nth-child(2) .stats-card-change', value: stats.trends.totalIncidents || 0 },
            { selector: '.stats-card:nth-child(3) .stats-card-change', value: stats.trends.activeOfficers || 0 },
            { selector: '.stats-card:nth-child(4) .stats-card-change', value: stats.trends.newMessages || 0 }
        ];

        changeElements.forEach(change => {
            const el = document.querySelector(change.selector);
            if (el) {
                const isPositive = change.value >= 0;
                el.innerHTML = isPositive ? 
                    `<i class="fas fa-arrow-up"></i><span>${Math.abs(change.value)}%</span>`:
                    `<i class="fas fa-arrow-down"></i><span>${Math.abs(change.value)}%</span>`;
                
                el.className = isPositive ? 'stats-card-change positive' : 'stats-card-change negative';
            }
        });
    }
}

let incidentsChart, incidentTypesChart;

function initCharts(chartData) {
    if (incidentsChart) incidentsChart.destroy();
    if (incidentTypesChart) incidentTypesChart.destroy();

    if (!chartData) {
        console.error('❌ No chart data received');
        return;
    }

    // Line chart (overview)
    const incidentsCtx = document.getElementById('incidentsChart');
    if (incidentsCtx && chartData.overview) {
        incidentsChart = new Chart(incidentsCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: chartData.overview.labels || [],
                datasets: [{
                    label: 'Incidents',
                    data: chartData.overview.data || [],
                    backgroundColor: 'rgba(67, 97, 238, 0.2)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Bar chart (types)
    const typesCtx = document.getElementById('incidentTypesChart');
    if (typesCtx && chartData.types) {
        incidentTypesChart = new Chart(typesCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: chartData.types.labels || [],
                datasets: [{
                    label: 'Incidents by Type',
                    data: chartData.types.data || [],
                    backgroundColor: [
                        'rgba(67, 97, 238, 0.7)',
                        'rgba(108, 117, 125, 0.7)',
                        'rgba(67, 97, 238, 0.7)',
                        'rgba(108, 117, 125, 0.7)',
                        'rgba(67, 97, 238, 0.7)'
                    ],
                    borderRadius: 5
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
}

// ✅ Update only line chart
async function updateCharts(period, token) {
    try {
        console.log(`🔄 Updating line chart for period: ${period}`);
        const chartsData = await fetchDashboardCharts(period);

        if (incidentsChart) incidentsChart.destroy();

        const incidentsCtx = document.getElementById('incidentsChart');
        if (incidentsCtx && chartsData.overview) {
            incidentsChart = new Chart(incidentsCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: chartsData.overview.labels || [],
                    datasets: [{
                        label: 'Incidents',
                        data: chartsData.overview.data || [],
                        backgroundColor: 'rgba(67, 97, 238, 0.2)',
                        borderColor: 'rgba(67, 97, 238, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }
    } catch (err) {
        console.error('❌ Error updating line chart:', err);
    }
}

// ✅ Update only bar chart
async function updateIncidentTypes(period, token) {
    try {
        console.log(`🔄 Updating bar chart for period: ${period}`);
        const chartsData = await fetchDashboardCharts(period);

        if (incidentTypesChart) incidentTypesChart.destroy();

        const typesCtx = document.getElementById('incidentTypesChart');
        if (typesCtx && chartsData.types) {
            incidentTypesChart = new Chart(typesCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: chartsData.types.labels || [],
                    datasets: [{
                        label: 'Incidents by Type',
                        data: chartsData.types.data || [],
                        backgroundColor: [
                            'rgba(67, 97, 238, 0.7)',
                            'rgba(108, 117, 125, 0.7)',
                            'rgba(67, 97, 238, 0.7)',
                            'rgba(108, 117, 125, 0.7)',
                            'rgba(67, 97, 238, 0.7)'
                        ],
                        borderRadius: 5
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }
    } catch (err) {
        console.error('❌ Error updating bar chart:', err);
    }
}

function updateActivity(activities) {
    const container = document.querySelector('.activity-list');
    if (!container) return;

    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="activity-item"><div class="activity-content"><p>No recent activity</p></div></div>';
        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon" style="${getActivityStyle(activity.type)}">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <p>${activity.message}</p>
                <span>${formatTime(activity.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

function updateNotifications(notifications) {
    const notificationBadge = document.querySelector('.notification-badge');
    const unreadCount = notifications.filter(n => !n.read).length;
    if (notificationBadge) {
        notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// ---------------- Utility Functions ----------------
function getActivityIcon(type) {
    const icons = { message: 'fa-comment', incident: 'fa-exclamation-triangle', officer: 'fa-user-plus', resolved: 'fa-check-circle', default: 'fa-bell' };
    return icons[type] || icons.default;
}

function getActivityStyle(type) {
    const styles = {
        message: 'background-color: rgba(76, 201, 240, 0.1); color: #4cc9f0;',
        incident: 'background-color: rgba(248, 149, 34, 0.1); color: #f8961e;',
        officer: 'background-color: rgba(67, 97, 238, 0.1); color: #4361ee;',
        resolved: 'background-color: rgba(46, 204, 113, 0.1); color: #2ecc71;',
        default: 'background-color: rgba(108, 117, 125, 0.1); color: #6c757d;'
    };
    return styles[type] || styles.default;
}

function formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return time.toLocaleDateString();
}

function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function showLoadingState(show) {
    document.body.style.opacity = show ? '0.7' : '1';
    document.body.style.pointerEvents = show ? 'none' : 'auto';
}

function showError(message) {
    console.error('Error:', message);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<div style="background:#fee;border:1px solid #fcc;padding:10px;margin:10px;border-radius:5px;color:#c33;">
            <strong>Error:</strong> ${message}
        </div>`;
    document.querySelector('.main').prepend(errorDiv);
    setTimeout(() => { if (errorDiv.parentNode) errorDiv.parentNode.removeChild(errorDiv); }, 5000);
}

window.addEventListener('resize', function() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    
    if (window.innerWidth > 768 && sidebar) {
        sidebar.classList.remove('active');
        if (main) main.classList.remove('active');
    }
    if (incidentsChart) incidentsChart.resize();
    if (incidentTypesChart) incidentTypesChart.resize();
});