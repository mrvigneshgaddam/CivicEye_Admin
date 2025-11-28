// dashboard.js - Complete fixed version with proper period switching
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard loading...');
    
    // Check authentication
    const token = sessionStorage.getItem('authToken');
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    
    if (!token) {
        console.log('No auth token found, redirecting to login...');
        window.location.href = '/index.html';
        return;
    }

    console.log('✅ Token found, starting dashboard...');
    initializeDashboardComponents(token, userData);
});

// Initialize all dashboard components
function initializeDashboardComponents(token, userData) {
    console.log('🔄 Initializing dashboard components...');
    
    // Display username
    const usernameElement = document.getElementById('username-display');
    if (usernameElement && userData.name) {
        usernameElement.textContent = userData.name;
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

    // Initialize dashboard immediately
    initializeDashboard();

    // Chart period buttons - FIXED: Proper event delegation and data handling
    document.querySelectorAll('.chart-period').forEach(periodContainer => {
        const buttons = periodContainer.querySelectorAll('button');
        const chartCard = periodContainer.closest('.chart-card');
        const chartTitle = chartCard.querySelector('h3')?.textContent || '';

        buttons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons in this container
                buttons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');
                
                const period = this.dataset.period;
                console.log(`🔄 Switching to ${period} period for: ${chartTitle}`);

                if (chartTitle.includes('Overview')) {
                    updateCharts(period);
                } else if (chartTitle.includes('Types')) {
                    updateIncidentTypes(period);
                }
            });
        });
    });

    // Logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    }

    // Auto-refresh every 2 mins
    setInterval(() => {
        initializeDashboard();
    }, 2 * 60 * 1000);
}

// Dashboard initialization function
async function initializeDashboard() {
    console.log('📊 Loading dashboard data...');
    
    try {
        // Try to load from mock API files first
        const [statsData, chartsData, activityData, notificationsData] = await Promise.allSettled([
            fetchMockData('dashboard-stats.json'),
            fetchMockData('dashboard-charts.json'),
            fetchMockData('dashboard-activity.json'),
            fetchMockData('notifications.json')
        ]);

        console.log('📦 Data loading results:', {
            stats: statsData.status,
            charts: chartsData.status,
            activity: activityData.status,
            notifications: notificationsData.status
        });

        // Process the data (use fallback if any failed)
        const processedStats = statsData.status === 'fulfilled' ? processStatsData(statsData.value) : getFallbackStats();
        const processedCharts = chartsData.status === 'fulfilled' ? processChartsData(chartsData.value) : getFallbackCharts();
        const processedActivity = activityData.status === 'fulfilled' ? processActivityData(activityData.value) : getFallbackActivity();
        const processedNotifications = notificationsData.status === 'fulfilled' ? processNotificationsData(notificationsData.value) : getFallbackNotifications();

        // Update UI with the data
        updateStats(processedStats);
        initCharts(processedCharts);
        updateActivity(processedActivity);
        updateNotifications(processedNotifications);

        console.log('✅ Dashboard updated successfully!');

    } catch (error) {
        console.error('❌ Dashboard error:', error);
        // Load fallback data as last resort
        loadGuaranteedData();
    }
}

// Data processing functions to handle different JSON structures
function processStatsData(data) {
    console.log('📊 Processing stats data:', data);
    // Handle both {data: {overview: {...}}} and direct {overview: {...}} structures
    if (data.data && data.data.overview) {
        return data.data;
    } else if (data.overview) {
        return data;
    }
    return getFallbackStats();
}

function processChartsData(data) {
    console.log('📈 Processing charts data:', data);
    // Handle both {data: {weekly: {...}}} and direct {weekly: {...}} structures
    if (data.data) {
        return data.data;
    }
    return data;
}

function processActivityData(data) {
    console.log('📝 Processing activity data:', data);
    // Handle both {data: {activity: [...]}} and direct {activity: [...]} structures
    if (data.data && data.data.activity) {
        return data.data.activity;
    } else if (data.activity) {
        return data.activity;
    } else if (Array.isArray(data)) {
        return data;
    }
    return getFallbackActivity();
}

function processNotificationsData(data) {
    console.log('🔔 Processing notifications data:', data);
    // Handle both {data: [...]} and direct array structures
    if (data.data) {
        return data.data;
    } else if (Array.isArray(data)) {
        return data;
    }
    return getFallbackNotifications();
}

// Universal mock data fetcher
async function fetchMockData(filename) {
    const paths = [
        `./mock_api/${filename}`,
        `../Dashboard/mock_api/${filename}`,
        `/FrontEnd/Dashboard/mock_api/${filename}`,
        `mock_api/${filename}`,
        `./FrontEnd/Dashboard/mock_api/${filename}`
    ];

    for (const path of paths) {
        try {
            console.log(`🔍 Trying path: ${path}`);
            const response = await fetch(path);
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Success with: ${path}`);
                return data;
            }
        } catch (error) {
            console.log(`❌ Failed: ${path} - ${error.message}`);
            continue;
        }
    }
    
    throw new Error(`Could not load ${filename} from any path`);
}

// Fallback data functions
function getFallbackStats() {
    console.log('🔄 Using fallback stats data');
    return {
        overview: {
            activeUsers: 1000,
            totalIncidents: 186,
            activeOfficers: 56,
            newMessages: 12,
            trends: {
                activeUsers: 20,
                totalIncidents: -10,
                activeOfficers: 50,
                newMessages: 12
            }
        }
    };
}

function getFallbackCharts() {
    console.log('🔄 Using fallback charts data');
    return {
        overview: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            data: [12, 8, 14, 25, 2, 30, 17]
        },
        types: {
            labels: ["Theft", "Assault", "Accident", "Fraud", "Other"],
            data: [15, 35, 20, 55, 10]
        },
        daily: {
            overview: {
                labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
                data: [5, 8, 15, 22, 18, 12]
            },
            types: {
                labels: ["Theft", "Assault", "Accident", "Fraud", "Other"],
                data: [8, 12, 6, 20, 4]
            }
        },
        weekly: {
            overview: {
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                data: [10, 14, 14, 5, 2, 30, 17]
            },
            types: {
                labels: ["Theft", "Assault", "Accident", "Fraud", "Other"],
                data: [15, 35, 20, 55, 10]
            }
        },
        monthly: {
            overview: {
                labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
                data: [45, 68, 52, 75]
            },
            types: {
                labels: ["Theft", "Assault", "Accident", "Fraud", "Other"],
                data: [60, 120, 80, 200, 40]
            }
        }
    };
}

function getFallbackActivity() {
    console.log('🔄 Using fallback activity data');
    return [
        {
            type: "incident",
            message: "New incident reported in Sector 21",
            timestamp: new Date().toISOString()
        },
        {
            type: "officer",
            message: "Officer Patel assigned to case #234",
            timestamp: new Date(Date.now() - 30 * 60000).toISOString()
        },
        {
            type: "resolved",
            message: "Case #198 resolved successfully",
            timestamp: new Date(Date.now() - 2 * 3600000).toISOString()
        },
        {
            type: "message",
            message: "New message received from HQ",
            timestamp: new Date(Date.now() - 5 * 3600000).toISOString()
        }
    ];
}

function getFallbackNotifications() {
    console.log('🔄 Using fallback notifications data');
    return [
        { id: 1, title: "System Update", message: "New security patch applied.", read: false },
        { id: 2, title: "Incident Alert", message: "Incident #234 requires attention.", read: true },
        { id: 3, title: "New Message", message: "Message from HQ.", read: false }
    ];
}

// Guaranteed data loading (will always work)
function loadGuaranteedData() {
    console.log('🛡️ Loading guaranteed data...');
    
    // This will ALWAYS work and show real data
    updateStats(getFallbackStats());
    initCharts(getFallbackCharts());
    updateActivity(getFallbackActivity());
    updateNotifications(getFallbackNotifications());
    
    console.log('✅ Guaranteed data loaded!');
}

// UI Update Functions
function updateStats(data) {
    if (!data || !data.overview) {
        console.error('❌ No stats data for update');
        return;
    }
    
    const stats = data.overview;
    console.log('📈 Updating stats with:', stats);

    // Update the DOM elements
    const elements = {
        'activeUsers': stats.activeUsers || 1080,
        'totalIncidents': stats.totalIncidents || 186,
        'activeOfficers': stats.activeOfficers || 56,
        'newMessages': stats.newMessages || 12
    };

    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value.toLocaleString();
            console.log(`✅ Updated ${id}: ${value}`);
        } else {
            console.error(`❌ Element not found: ${id}`);
        }
    }

    // Update trends
    if (stats.trends) {
        updateTrendElement('activeUsersChange', stats.trends.activeUsers);
        updateTrendElement('totalIncidentsChange', stats.trends.totalIncidents);
        updateTrendElement('activeOfficersChange', stats.trends.activeOfficers);
        updateTrendElement('newMessagesChange', stats.trends.newMessages);
    }
}

function updateTrendElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const isPositive = value >= 0;
    element.innerHTML = isPositive ? 
        `<i class="fas fa-arrow-up"></i><span>${Math.abs(value)}%</span>` :
        `<i class="fas fa-arrow-down"></i><span>${Math.abs(value)}%</span>`;
    
    element.className = isPositive ? 'stats-card-change positive' : 'stats-card-change negative';
}

let incidentsChart, incidentTypesChart;

function initCharts(chartData) {
    if (!chartData) return;

    // Destroy existing charts
    if (incidentsChart) incidentsChart.destroy();
    if (incidentTypesChart) incidentTypesChart.destroy();

    // Line chart (overview) - Start with weekly data
    const incidentsCtx = document.getElementById('incidentsChart');
    if (incidentsCtx && chartData.weekly && chartData.weekly.overview) {
        incidentsChart = new Chart(incidentsCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: chartData.weekly.overview.labels || [],
                datasets: [{
                    label: 'Incidents',
                    data: chartData.weekly.overview.data || [],
                    backgroundColor: 'rgba(67, 97, 238, 0.2)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } } 
            }
        });
    }

    // Bar chart (types) - Start with weekly data
    const typesCtx = document.getElementById('incidentTypesChart');
    if (typesCtx && chartData.weekly && chartData.weekly.types) {
        incidentTypesChart = new Chart(typesCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: chartData.weekly.types.labels || [],
                datasets: [{
                    label: 'Incidents by Type',
                    data: chartData.weekly.types.data || [],
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
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } } 
            }
        });
    }
}

// FIXED: Proper chart updating with correct period data
async function updateCharts(period) {
    try {
        const chartsData = await fetchMockData('dashboard-charts.json');
        const processedData = processChartsData(chartsData);
        
        console.log(`📊 Updating charts for period: ${period}`, processedData);
        
        let chartData;
        switch(period) {
            case 'day':
                chartData = processedData.daily || processedData.weekly || processedData;
                break;
            case 'week':
                chartData = processedData.weekly || processedData;
                break;
            case 'month':
                chartData = processedData.monthly || processedData.weekly || processedData;
                break;
            default:
                chartData = processedData.weekly || processedData;
        }

        // Destroy existing chart
        if (incidentsChart) {
            incidentsChart.destroy();
        }

        const incidentsCtx = document.getElementById('incidentsChart');
        if (incidentsCtx && chartData && chartData.overview) {
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
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } } 
                }
            });
            console.log(`✅ Updated incidents chart for ${period}`);
        } else {
            console.error('❌ No chart data found for period:', period);
        }
    } catch (err) {
        console.error('❌ Error updating charts:', err);
        // Fallback to default data
        loadFallbackChartData(period, 'overview');
    }
}

// FIXED: Proper incident types updating with correct period data
async function updateIncidentTypes(period) {
    try {
        const chartsData = await fetchMockData('dashboard-charts.json');
        const processedData = processChartsData(chartsData);
        
        console.log(`📊 Updating incident types for period: ${period}`, processedData);
        
        let chartData;
        switch(period) {
            case 'day':
                chartData = processedData.daily || processedData.weekly || processedData;
                break;
            case 'week':
                chartData = processedData.weekly || processedData;
                break;
            case 'month':
                chartData = processedData.monthly || processedData.weekly || processedData;
                break;
            default:
                chartData = processedData.weekly || processedData;
        }

        // Destroy existing chart
        if (incidentTypesChart) {
            incidentTypesChart.destroy();
        }

        const typesCtx = document.getElementById('incidentTypesChart');
        if (typesCtx && chartData && chartData.types) {
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
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } } 
                }
            });
            console.log(`✅ Updated incident types chart for ${period}`);
        } else {
            console.error('❌ No incident types data found for period:', period);
        }
    } catch (err) {
        console.error('❌ Error updating incident types:', err);
        // Fallback to default data
        loadFallbackChartData(period, 'types');
    }
}

// Fallback chart data loader
function loadFallbackChartData(period, chartType) {
    const fallbackData = getFallbackCharts();
    let chartData;
    
    switch(period) {
        case 'day':
            chartData = fallbackData.daily || fallbackData.weekly;
            break;
        case 'week':
            chartData = fallbackData.weekly;
            break;
        case 'month':
            chartData = fallbackData.monthly || fallbackData.weekly;
            break;
        default:
            chartData = fallbackData.weekly;
    }

    if (chartType === 'overview' && incidentsChart) {
        incidentsChart.data.labels = chartData.overview.labels;
        incidentsChart.data.datasets[0].data = chartData.overview.data;
        incidentsChart.update();
    } else if (chartType === 'types' && incidentTypesChart) {
        incidentTypesChart.data.labels = chartData.types.labels;
        incidentTypesChart.data.datasets[0].data = chartData.types.data;
        incidentTypesChart.update();
    }
}

function updateActivity(activities) {
    const container = document.querySelector('.activity-list');
    if (!container) return;

    // Ensure activities is an array
    if (!activities || !Array.isArray(activities) || activities.length === 0) {
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
                <span class="activity-time">${formatTime(activity.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

function updateNotifications(notifications) {
    const notificationBadge = document.querySelector('.notification-badge');
    const unreadCount = notifications && Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;
    
    if (notificationBadge) {
        notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    updateNotificationsDropdown(notifications);
}

function updateNotificationsDropdown(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    
    if (!notificationsList) return;
    
    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
        notificationsList.innerHTML = '';
        if (noNotifications) noNotifications.style.display = 'block';
        return;
    }
    
    if (noNotifications) noNotifications.style.display = 'none';
    
    notificationsList.innerHTML = notifications.map(notification => `
        <li>
            <div class="notification-icon"><i class="fas fa-bell"></i></div>
            <div class="notification-content">
                <p><strong>${notification.title || 'Notification'}</strong>: ${notification.message}</p>
                <div class="notification-time">${formatTime(notification.timestamp || new Date().toISOString())}</div>
            </div>
        </li>
    `).join('');
}

// Utility Functions
function getActivityIcon(type) {
    const icons = { 
        message: 'fa-comment', 
        incident: 'fa-exclamation-triangle', 
        officer: 'fa-user-plus', 
        resolved: 'fa-check-circle', 
        default: 'fa-bell' 
    };
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
    if (!timestamp) return 'Just now';
    
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

// Initialize notifications dropdown
document.addEventListener('DOMContentLoaded', () => {
    const clearNotifications = document.getElementById('clearNotifications');
    
    if (clearNotifications) {
        clearNotifications.addEventListener('click', () => {
            const notificationsList = document.getElementById('notificationsList');
            const noNotifications = document.getElementById('noNotifications');
            const badge = document.querySelector('.notification-badge');
            
            if (notificationsList) notificationsList.innerHTML = '';
            if (noNotifications) noNotifications.style.display = 'block';
            if (badge) {
                badge.textContent = '0';
                badge.style.display = 'none';
            }
        });
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (incidentsChart) incidentsChart.resize();
    if (incidentTypesChart) incidentTypesChart.resize();
});