// 使用Supabase的管理员后台逻辑
let currentTab = 'analytics';
let refreshInterval;

// 管理员配置
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// 等待页面加载完成
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.supabaseDb.init();
        
        // 订阅实时数据变化
        window.supabaseDb.subscribeToRealtime();
        
        // 监听实时更新事件
        window.supabaseDb.onRealtimeUpdate((event) => {
            const { type, data } = event.detail;
            handleRealtimeUpdate(type, data);
        });
        
        // 检查登录状态
        checkLoginStatus();
        
        // 绑定事件
        bindEvents();
        
    } catch (error) {
        console.error('管理员后台初始化失败:', error);
        showTip('数据库连接失败，请刷新页面重试', 'error');
    }
});

// 处理实时更新
function handleRealtimeUpdate(type, data) {
    switch (type) {
        case 'new_post':
            // 新帖子发布，更新统计
            if (currentTab === 'analytics') {
                loadAnalytics();
            }
            break;
        case 'post_reported':
            // 帖子被举报，更新内容管理
            if (currentTab === 'posts') {
                loadPosts();
            }
            break;
        case 'post_approved':
        case 'post_rejected':
        case 'post_deleted':
            // 帖子状态变化，更新内容管理
            if (currentTab === 'posts') {
                loadPosts();
            }
            break;
        case 'new_visit':
            // 新访问，更新统计
            if (currentTab === 'analytics' || currentTab === 'realtime') {
                loadAnalytics();
                loadRealtime();
            }
            break;
    }
}

// 绑定事件
function bindEvents() {
    // 登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 登出按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 标签页切换
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

// 检查登录状态
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('admin_logged_in') === 'true';
    const loginTime = localStorage.getItem('admin_login_time');
    const now = Date.now();
    
    // 检查是否在24小时内登录
    if (isLoggedIn && loginTime && (now - parseInt(loginTime)) < 24 * 60 * 60 * 1000) {
        showAdminInterface();
    } else {
        showLoginForm();
    }
}

// 显示登录表单
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('adminInterface').style.display = 'none';
}

// 显示管理员界面
function showAdminInterface() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminInterface').style.display = 'block';
    
    // 加载初始数据
    switchTab(currentTab);
    startAutoRefresh();
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        localStorage.setItem('admin_logged_in', 'true');
        localStorage.setItem('admin_login_time', Date.now().toString());
        showAdminInterface();
        showTip('登录成功', 'success');
    } else {
        showTip('用户名或密码错误', 'error');
    }
}

// 处理登出
function handleLogout() {
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_login_time');
    showLoginForm();
    stopAutoRefresh();
    showTip('已登出', 'info');
}

// 切换标签页
function switchTab(tabName) {
    currentTab = tabName;
    
    // 更新按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // 加载对应数据
    if (tabName === 'analytics') {
        loadAnalytics();
    } else if (tabName === 'posts') {
        loadPosts();
    } else if (tabName === 'realtime') {
        loadRealtime();
    }
}

// 加载统计数据
async function loadAnalytics() {
    try {
        const data = await window.supabaseDb.getAnalytics(24);
        
        document.getElementById('totalVisits').textContent = data.totalVisits;
        document.getElementById('uniqueVisitors').textContent = data.uniqueVisitors;
        document.getElementById('uniqueIPs').textContent = data.uniqueIPs;
        document.getElementById('realtimeVisits').textContent = data.realtimeVisits;
        
        // 设备统计
        const deviceStatsBody = document.getElementById('deviceStats');
        deviceStatsBody.innerHTML = '';
        data.deviceStats.forEach(stat => {
            const percentage = data.totalVisits > 0 ? ((stat.count / data.totalVisits) * 100).toFixed(1) : 0;
            deviceStatsBody.innerHTML += `
                <tr>
                    <td>${stat.device_model}</td>
                    <td>${stat.count}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        // 浏览器统计
        const browserStatsBody = document.getElementById('browserStats');
        browserStatsBody.innerHTML = '';
        data.browserStats.forEach(stat => {
            const percentage = data.totalVisits > 0 ? ((stat.count / data.totalVisits) * 100).toFixed(1) : 0;
            browserStatsBody.innerHTML += `
                <tr>
                    <td>${stat.browser_kernel}</td>
                    <td>${stat.count}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        // IP统计
        const ipStatsBody = document.getElementById('ipStats');
        ipStatsBody.innerHTML = '';
        data.ipStats.forEach(stat => {
            const percentage = data.totalVisits > 0 ? ((stat.count / data.totalVisits) * 100).toFixed(1) : 0;
            ipStatsBody.innerHTML += `
                <tr>
                    <td>${stat.ip_address}</td>
                    <td>${stat.count}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Analytics load error:', error);
        showTip('统计数据加载失败', 'error');
    }
}

// 加载帖子列表
async function loadPosts() {
    try {
        const data = await window.supabaseDb.getReportedPosts();
        
        const postsList = document.getElementById('postsList');
        if (data.list.length === 0) {
            postsList.innerHTML = '<p style="text-align: center; color: #6c757d;">暂无被举报内容</p>';
            return;
        }
        
        postsList.innerHTML = '';
        data.list.forEach(post => {
            const postDiv = document.createElement('div');
            postDiv.className = 'post-item';
            postDiv.innerHTML = `
                <div class="post-meta">
                    <strong>ID:</strong> ${post.id} | 
                    <strong>时间:</strong> ${new Date(post.created_at * 1000).toLocaleString()}
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; white-space: pre-wrap;">${escapeHtml(post.content)}</div>
                <div>
                    <button class="btn" onclick="approvePost('${post.id}')">✅ 重新发布</button>
                    <button class="btn btn-danger" onclick="rejectPost('${post.id}')">🚫 隐藏</button>
                    <button class="btn btn-secondary" onclick="deletePost('${post.id}')">🗑️ 删除</button>
                </div>
            `;
            postsList.appendChild(postDiv);
        });
    } catch (error) {
        console.error('Posts load error:', error);
        showTip('帖子列表加载失败', 'error');
    }
}

// 加载实时监控
async function loadRealtime() {
    try {
        const data = await window.supabaseDb.getAnalytics(1); // 最近1小时
        
        const realtimeList = document.getElementById('realtimeList');
        if (data.recentVisits.length === 0) {
            realtimeList.innerHTML = '<p style="text-align: center; color: #6c757d;">暂无访问记录</p>';
            return;
        }
        
        realtimeList.innerHTML = '';
        data.recentVisits.slice(0, 20).forEach(visit => {
            const visitDiv = document.createElement('div');
            visitDiv.style.cssText = 'padding: 10px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center;';
            visitDiv.innerHTML = `
                <div>
                    <strong>${visit.ip_address}</strong> | 
                    ${visit.device_model} | 
                    ${visit.browser_kernel} | 
                    ${visit.page_path}
                </div>
                <div class="small">${new Date(visit.created_at * 1000).toLocaleString()}</div>
            `;
            realtimeList.appendChild(visitDiv);
        });
    } catch (error) {
        console.error('Realtime load error:', error);
        showTip('实时监控加载失败', 'error');
    }
}

// 审核帖子
async function approvePost(id) {
    try {
        await window.supabaseDb.approvePost(id);
        showTip('帖子已重新发布', 'success');
        loadPosts();
    } catch (error) {
        console.error('Approve error:', error);
        showTip('操作失败', 'error');
    }
}

// 隐藏帖子
async function rejectPost(id) {
    try {
        await window.supabaseDb.rejectPost(id);
        showTip('帖子已隐藏', 'success');
        loadPosts();
    } catch (error) {
        console.error('Reject error:', error);
        showTip('操作失败', 'error');
    }
}

// 删除帖子
async function deletePost(id) {
    if (!confirm('确定要删除这个帖子吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        await window.supabaseDb.deletePost(id);
        showTip('帖子已删除', 'success');
        loadPosts();
    } catch (error) {
        console.error('Delete error:', error);
        showTip('操作失败', 'error');
    }
}

// 自动刷新
function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        if (currentTab === 'analytics') {
            loadAnalytics();
        } else if (currentTab === 'realtime') {
            loadRealtime();
        } else if (currentTab === 'posts') {
            loadPosts();
        }
    }, 3000); // 每3秒刷新一次
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

// 显示提示信息
function showTip(message, type = 'info') {
    const tip = document.createElement('div');
    tip.className = `tip tip-${type}`;
    tip.textContent = message;
    tip.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    // 设置不同类型的颜色
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    tip.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(tip);
    
    setTimeout(() => {
        tip.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (document.body.contains(tip)) {
                document.body.removeChild(tip);
            }
        }, 300);
    }, 5000);
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
