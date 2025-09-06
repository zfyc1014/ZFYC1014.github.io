// 使用Supabase的前端应用逻辑
let page = 1;
let pageSize = 20;
let loading = false;
let lastPostTime = 0;

// 等待数据库初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.supabaseDb.init();
        await window.supabaseDb.recordVisit('/');
        
        // 订阅实时数据变化
        window.supabaseDb.subscribeToRealtime();
        
        // 加载初始数据
        load();
        
        // 监听实时更新事件
        window.supabaseDb.onRealtimeUpdate((event) => {
            const { type, data } = event.detail;
            handleRealtimeUpdate(type, data);
        });
        
        // 定期记录访问（每5分钟）
        setInterval(async () => {
            try {
                await window.supabaseDb.recordVisit('/');
            } catch (error) {
                console.error('Visit recording error:', error);
            }
        }, 5 * 60 * 1000);
        
    } catch (error) {
        console.error('数据库初始化失败:', error);
        showTip('数据库连接失败，请刷新页面重试', 'error');
    }
});

// 处理实时更新
function handleRealtimeUpdate(type, data) {
    switch (type) {
        case 'new_post':
            addPostToUI(data);
            showTip('有新内容发布！', 'success');
            break;
        case 'post_reported':
            removePostFromUI(data.id);
            showTip('内容已被举报，等待审核', 'warning');
            break;
        case 'post_approved':
            addPostToUI(data);
            showTip('内容已重新发布', 'success');
            break;
        case 'post_rejected':
            removePostFromUI(data.id);
            showTip('内容已被隐藏', 'info');
            break;
        case 'post_deleted':
            removePostFromUI(data.id);
            showTip('内容已被删除', 'info');
            break;
        case 'new_visit':
            // 可以在这里处理新的访问统计
            break;
    }
}

// 提交帖子
async function submitPost() {
    if (loading) return;
    
    const content = document.getElementById('content').value.trim();
    const agree = document.getElementById('agree').checked;
    
    if (!content) {
        showTip('请输入内容', 'error');
        return;
    }
    
    if (content.length > 1000) {
        showTip('内容不能超过1000字', 'error');
        return;
    }
    
    if (!agree) {
        showTip('请先阅读并同意免责声明', 'error');
        return;
    }
    
    loading = true;
    document.querySelector('.btn').disabled = true;
    
    try {
        await window.supabaseDb.addPost(content);
        showTip('✅ 发布成功！', 'success');
        document.getElementById('content').value = '';
        document.getElementById('agree').checked = false;
        
        // 重新加载第一页以显示新内容
        page = 1;
        load();
    } catch (error) {
        console.error('Submit error:', error);
        showTip('发布失败，请重试', 'error');
    } finally {
        loading = false;
        document.querySelector('.btn').disabled = false;
    }
}

// 加载帖子列表
async function load() {
    if (loading) return;
    loading = true;
    document.getElementById('list').classList.add('loading');
    
    try {
        const data = await window.supabaseDb.getPosts('published', page, pageSize);
        const el = document.getElementById('list');
        
        if (page === 1) el.innerHTML = '';
        
        if (data.list.length === 0 && page === 1) {
            el.innerHTML = '<div class="card"><p style="text-align: center; color: #6c757d;">暂无内容，快来发布第一条消息吧！</p></div>';
        } else {
            for (const post of data.list) {
                const postDiv = document.createElement('div');
                postDiv.className = 'post-item';
                postDiv.setAttribute('data-post-id', post.id);
                
                // 检查是否已点赞
                const hasLiked = await window.supabaseDb.hasLiked(post.id, window.supabaseDb.getVisitorId());
                const likeButtonText = hasLiked ? '👍 已赞' : '👍 点赞';
                const likeButtonClass = hasLiked ? 'btn btn-success' : 'btn btn-secondary';
                
                postDiv.innerHTML = `
                    <div class="post-content">${escapeHtml(post.content)}</div>
                    <div class="post-meta">
                        <div class="small">
                            📅 ${new Date(post.created_at * 1000).toLocaleString()}
                            <span style="margin-left: 15px;">👍 ${post.likes}</span>
                        </div>
                        <div class="post-actions">
                            <button class="${likeButtonClass}" onclick="like('${post.id}', this)">${likeButtonText}</button>
                            <button class="btn btn-secondary" onclick="report('${post.id}')">🚨 举报</button>
                        </div>
                    </div>
                `;
                el.appendChild(postDiv);
                
                // 记录最后帖子时间
                if (page === 1 && lastPostTime === 0) {
                    lastPostTime = post.created_at;
                }
            }
        }
        
        // 显示加载更多按钮
        const loadMoreBtn = document.querySelector('.load-more');
        if (data.list.length < pageSize) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Load error:', error);
        showTip('加载失败，请重试', 'error');
    } finally {
        loading = false;
        document.getElementById('list').classList.remove('loading');
    }
}

// 点赞
async function like(id, btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    
    try {
        await window.supabaseDb.likePost(id);
        
        // 重新加载当前页面以更新点赞状态
        page = 1;
        load();
        
        showTip('操作成功', 'success');
    } catch (error) {
        console.error('Like error:', error);
        showTip('操作失败，请重试', 'error');
    } finally {
        btn.disabled = false;
    }
}

// 举报
async function report(id) {
    const reason = prompt('举报理由（可选）:');
    if (reason === null) return;
    
    try {
        await window.supabaseDb.reportPost(id, reason);
        alert('✅ 举报已提交，内容已进入审核，感谢您的反馈');
        
        // 重新加载当前页面
        page = 1;
        load();
    } catch (error) {
        console.error('Report error:', error);
        alert('网络错误，请重试');
    }
}

// 加载更多
function nextPage() {
    page++;
    load();
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
            document.body.removeChild(tip);
        }, 300);
    }, 5000);
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 添加帖子到UI
function addPostToUI(post) {
    const postsContainer = document.getElementById('list');
    if (!postsContainer) return;
    
    const postElement = createPostElement(post);
    postsContainer.insertBefore(postElement, postsContainer.firstChild);
    
    // 更新最后帖子时间
    lastPostTime = post.created_at;
}

// 从UI移除帖子
function removePostFromUI(postId) {
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (postElement) {
        postElement.remove();
    }
}

// 创建帖子元素
async function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-item';
    postDiv.setAttribute('data-post-id', post.id);
    
    // 检查是否已点赞
    const hasLiked = await window.supabaseDb.hasLiked(post.id, window.supabaseDb.getVisitorId());
    const likeButtonText = hasLiked ? '👍 已赞' : '👍 点赞';
    const likeButtonClass = hasLiked ? 'btn btn-success' : 'btn btn-secondary';
    
    postDiv.innerHTML = `
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-meta">
            <div class="small">
                📅 ${new Date(post.created_at * 1000).toLocaleString()}
                <span style="margin-left: 15px;">👍 ${post.likes}</span>
            </div>
            <div class="post-actions">
                <button class="${likeButtonClass}" onclick="like('${post.id}', this)">${likeButtonText}</button>
                <button class="btn btn-secondary" onclick="report('${post.id}')">🚨 举报</button>
            </div>
        </div>
    `;
    
    return postDiv;
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
