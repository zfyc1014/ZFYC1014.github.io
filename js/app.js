// 前端应用逻辑
let page = 1;
let pageSize = 20;
let loading = false;
let lastPostTime = 0; // 记录最后一条帖子的时间

// 等待数据库初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.db.init();
        await window.db.recordVisit('/');
        load();
        
        // 监听实时更新事件
        window.db.onRealtimeUpdate((event) => {
            const { type, data } = event.detail;
            if (type === 'new_post') {
                // 新帖子发布，实时显示
                addPostToUI(data);
                showTip('有新内容发布！', 'success');
            } else if (type === 'post_reported') {
                // 帖子被举报，从界面移除
                removePostFromUI(data.id);
                showTip('内容已被举报，等待审核', 'warning');
            }
        });
        
        // 定期记录访问（每5分钟）
        setInterval(async () => {
            try {
                await window.db.recordVisit('/');
            } catch (error) {
                console.error('Visit recording error:', error);
            }
        }, 5 * 60 * 1000);
        
        // 定期检查新内容（每10秒）
        setInterval(async () => {
            try {
                await checkForNewPosts();
            } catch (error) {
                console.error('Check new posts error:', error);
            }
        }, 10 * 1000);
    } catch (error) {
        console.error('Database initialization failed:', error);
        showTip('数据库初始化失败', 'error');
    }
});

// 提交帖子
async function submitPost() {
    if (loading) return;

    if (!document.getElementById('agree').checked) {
        showTip('请先阅读并勾选同意《投稿免责声明》', 'error');
        return;
    }

    const content = document.getElementById('content').value.trim();

    if (!content) {
        showTip('请输入内容', 'error');
        return;
    }

    if (content.length > 1000) {
        showTip('内容不能超过1000字', 'error');
        return;
    }

    loading = true;
    document.querySelector('.btn').disabled = true;

    try {
        await window.db.addPost(content);
        showTip('✅ 发布成功！', 'success');
        document.getElementById('content').value = '';
        document.getElementById('agree').checked = false;
    } catch (error) {
        console.error('Submit error:', error);
        showTip('提交失败，请重试', 'error');
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
        const data = await window.db.getPosts('published', page, pageSize);
        const el = document.getElementById('list');

        if (page === 1) el.innerHTML = '';

        if (data.list.length === 0 && page === 1) {
            el.innerHTML = '<div class="card"><p style="text-align: center; color: #6c757d;">暂无内容，快来发布第一条消息吧！</p></div>';
        } else {
            for (const post of data.list) {
                const postDiv = document.createElement('div');
                postDiv.className = 'post-item';
                postDiv.setAttribute('data-post-id', post.id);
                postDiv.innerHTML = `
                    <div class="post-content">${escapeHtml(post.content)}</div>
                    <div class="post-meta">
                        <div class="small">
                            📅 ${new Date(post.created_at * 1000).toLocaleString()}
                            <span style="margin-left: 15px;">👍 ${post.likes}</span>
                        </div>
                        <div class="post-actions">
                            <button class="btn btn-secondary" onclick="like('${post.id}', this)">👍 点赞</button>
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
    btn.innerHTML = '⏳ 点赞中...';

    try {
        await window.db.likePost(parseInt(id));
        btn.innerHTML = '✅ 已赞';
        
        // 更新点赞数显示
        const meta = btn.closest('.post-meta');
        const likeSpan = meta.querySelector('.small span');
        const currentLikes = parseInt(likeSpan.textContent.match(/\d+/)[0]);
        likeSpan.innerHTML = `👍 ${currentLikes + 1}`;
    } catch (error) {
        console.error('Like error:', error);
        if (error.message === '你已经点过赞了') {
            alert('你已经点过赞了');
        } else {
            alert('网络错误，请重试');
        }
        btn.disabled = false;
        btn.innerHTML = '👍 点赞';
    }
}

// 举报
async function report(id) {
    const reason = prompt('举报理由（可选）:');
    if (reason === null) return;

    try {
        await window.db.reportPost(parseInt(id), reason);
        alert('✅ 举报已提交，内容已进入审核，感谢您的反馈');
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
function showTip(message, type) {
    const tip = document.getElementById('tip');
    tip.innerHTML = message;
    tip.className = `tip ${type}`;
    setTimeout(() => {
        tip.innerHTML = '';
        tip.className = '';
    }, 5000);
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 检查新帖子
async function checkForNewPosts() {
    try {
        const data = await window.db.getPosts('published', 1, 1);
        if (data.list.length > 0) {
            const latestPost = data.list[0];
            if (latestPost.created_at > lastPostTime) {
                lastPostTime = latestPost.created_at;
                // 有新帖子，重新加载第一页
                page = 1;
                load();
            }
        }
    } catch (error) {
        console.error('Check new posts error:', error);
    }
}

// 添加帖子到UI
function addPostToUI(post) {
    const postsContainer = document.getElementById('posts');
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
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.setAttribute('data-post-id', post.id);
    
    postDiv.innerHTML = `
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="post-actions">
            <button onclick="like('${post.id}', this)" class="like-btn">
                <span class="like-icon">👍</span>
                <span class="like-count">${post.likes}</span>
            </button>
            <button onclick="report('${post.id}')" class="report-btn">举报</button>
            <span class="post-time">${new Date(post.created_at * 1000).toLocaleString()}</span>
        </div>
    `;
    
    return postDiv;
}
