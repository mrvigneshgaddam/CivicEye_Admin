// dashboard.js - Fixed version to show real backend data
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    const token = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        console.log('No auth token found, redirecting to login...');
        window.location.href = '/index.html';
        return;
    }

    // Display username in header
    const usernameElement = document.getElementById('username-display');
    if (usernameElement && userData.username) {
        usernameElement.textContent = userData.username;
    }

    // Sidebar toggle functionality
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');

    if (sidebarCollapse && sidebar && main) {
        sidebarCollapse.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            main.classList.toggle('active');
        });
    }

    // Initialize dashboard with authentication
    initializeDashboard(token);

    // Chart period buttons functionality
    const chartPeriodButtons = document.querySelectorAll('.chart-period button');
    chartPeriodButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.parentElement.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            updateCharts(this.dataset.period, token);
        });
    });

    // Logout functionality
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }

    // Quick action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            handleQuickAction(this.dataset.action, token);
        });
    });

    // Refresh button functionality
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            initializeDashboard(token);
        });
    }

    async function initializeDashboard(token) {
        try {
            showLoadingState(true);
            
            console.log('🔄 Fetching real data from backend...');
            
            // Fetch all dashboard data in parallel
            const [statsData, chartsData, activityData, notificationsData] = await Promise.all([
                fetchDashboardStats(token),
                fetchDashboardCharts(token, 'week'),
                fetchRecentActivity(token),
                fetchNotifications(token)
            ]);
            
            console.log('✅ Backend data received:', {
                stats: statsData ? 'Received' : 'Failed',
                charts: chartsData ? 'Received' : 'Failed',
                activity: activityData ? 'Received' : 'Failed',
                notifications: notificationsData ? 'Received' : 'Failed'
            });
            
            // Update all dashboard components
            updateStats(statsData);
            initCharts(chartsData);
            updateActivity(activityData);
            updateNotifications(notificationsData);

        } catch (error) {
            console.error('Dashboard initialization error:', error);
            showError('Failed to load dashboard data. Please check if the backend server is running.');
        } finally {
            showLoadingState(false);
        }
    }

    // API Functions - REMOVED MOCK DATA FALLBACK
    async function fetchDashboardStats(token) {
        try {
            console.log('📊 Fetching dashboard stats from API...');
            const response = await fetch('/api/dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
                return null;
            }

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📊 Stats data:', data);
            return data.data;
        } catch (error) {
            console.error('❌ Error fetching stats:', error);
            // RETURN NULL INSTEAD OF MOCK DATA
            return null;
        }
    }

    async function fetchDashboardCharts(token, period = 'week') {
        try {
            console.log('📈 Fetching charts data from API...');
            const response = await fetch(`/api/dashboard/charts?period=${period}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
                return null;
            }

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📈 Charts data:', data);
            return data.data;
        } catch (error) {
            console.error('❌ Error fetching charts:', error);
            // RETURN NULL INSTEAD OF MOCK DATA
            return null;
        }
    }

    async function fetchRecentActivity(token) {
        try {
            console.log('📋 Fetching activity data from API...');
            const response = await fetch('/api/dashboard/activity', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
                return null;
            }

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📋 Activity data:', data);
            return data.data?.activity || [];
        } catch (error) {
            console.error('❌ Error fetching activity:', error);
            // RETURN EMPTY ARRAY INSTEAD OF MOCK DATA
            return [];
        }
    }

    async function fetchNotifications(token) {
        try {
            console.log('🔔 Fetching notifications from API...');
            const response = await fetch('/api/notifications', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
                return [];
            }

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('🔔 Notifications data:', data);
            return data.data || [];
        } catch (error) {
            console.error('❌ Error fetching notifications:', error);
            // RETURN EMPTY ARRAY INSTEAD OF MOCK DATA
            return [];
        }
    }

    function updateStats(data) {
        if (!data || !data.overview) {
            console.error('❌ No stats data received from backend');
            showError('Could not load dashboard statistics. Please check your backend connection.');
            return;
        }
        
        const stats = data.overview;
        console.log('🔄 Updating stats with real data:', stats);
        
        const statElements = [
            { selector: '.stats-card:nth-child(1) h2', value: stats.activeUsers || 0 },
            { selector: '.stats-card:nth-child(2) h2', value: stats.totalIncidents || 0 },
            { selector: '.stats-card:nth-child(3) h2', value: stats.activeOfficers || 0 },
            { selector: '.stats-card:nth-child(4) h2', value: stats.newMessages || 0 }
        ];

        statElements.forEach(stat => {
            const el = document.querySelector(stat.selector);
            if (el) {
                animateValue(el, 0, stat.value, 1000);
            }
        });

        // Update percentage changes only if trends data exists
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
                        `<i class="fas fa-arrow-up"></i><span>${Math.abs(change.value)}%</span>` :
                        `<i class="fas fa-arrow-down"></i><span>${Math.abs(change.value)}%</span>`;
                    
                    el.className = isPositive ? 
                        'stats-card-change positive' : 
                        'stats-card-change negative';
                }
            });
        }
    }

    let incidentsChart, incidentTypesChart;

    function initCharts(chartData) {
        // Destroy existing charts if they exist
        if (incidentsChart) incidentsChart.destroy();
        if (incidentTypesChart) incidentTypesChart.destroy();

        if (!chartData) {
            console.error('❌ No chart data received from backend');
            return;
        }

        // Line Chart - Incidents Overview
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
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                drawBorder: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        // Bar Chart - Incident Types
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
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                drawBorder: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
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

    // ... (keep the rest of the utility functions the same)
    // Utility functions (getActivityIcon, getActivityStyle, formatTime, animateValue, etc.)
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
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function showLoadingState(show) {
        if (show) {
            document.body.style.opacity = '0.7';
            document.body.style.pointerEvents = 'none';
        } else {
            document.body.style.opacity = '1';
            document.body.style.pointerEvents = 'auto';
        }
    }

    function showError(message) {
        console.error('Error:', message);
        // You can replace this with a toast notification or modal
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div style="background: #fee; border: 1px solid #fcc; padding: 10px; margin: 10px; border-radius: 5px; color: #c33;">
                <strong>Error:</strong> ${message}
            </div>
        `;
        document.querySelector('.main').prepend(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    function showSuccess(message) {
        console.log('Success:', message);
        // You can replace this with a toast notification
        alert('Success: ' + message);
    }

    // Responsive adjustments
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebar) {
            sidebar.classList.remove('active');
            if (main) main.classList.remove('active');
        }
        
        if (incidentsChart) incidentsChart.resize();
        if (incidentTypesChart) incidentTypesChart.resize();
    });

    // Auto-refresh dashboard every 5 minutes
    setInterval(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            initializeDashboard(token);
        }
    }, 5 * 60 * 1000);
});