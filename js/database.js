// 前端数据库管理 - 使用IndexedDB和localStorage
class Database {
    constructor() {
        this.dbName = 'EchoHoleDB';
        this.version = 1;
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建posts表
                if (!db.objectStoreNames.contains('posts')) {
                    const postsStore = db.createObjectStore('posts', { keyPath: 'id', autoIncrement: true });
                    postsStore.createIndex('status', 'status', { unique: false });
                    postsStore.createIndex('created_at', 'created_at', { unique: false });
                }
                
                // 创建likes表
                if (!db.objectStoreNames.contains('likes')) {
                    const likesStore = db.createObjectStore('likes', { keyPath: 'id', autoIncrement: true });
                    likesStore.createIndex('post_id', 'post_id', { unique: false });
                    likesStore.createIndex('visitor_id', 'visitor_id', { unique: false });
                }
                
                // 创建reports表
                if (!db.objectStoreNames.contains('reports')) {
                    const reportsStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
                    reportsStore.createIndex('post_id', 'post_id', { unique: false });
                    reportsStore.createIndex('visitor_id', 'visitor_id', { unique: false });
                }
                
                // 创建analytics表
                if (!db.objectStoreNames.contains('analytics')) {
                    const analyticsStore = db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
                    analyticsStore.createIndex('created_at', 'created_at', { unique: false });
                    analyticsStore.createIndex('visitor_id', 'visitor_id', { unique: false });
                }
            };
        });
    }

    // 获取访客ID
    getVisitorId() {
        let visitorId = localStorage.getItem('visitor_id');
        if (!visitorId) {
            visitorId = this.generateUUID();
            localStorage.setItem('visitor_id', visitorId);
        }
        return visitorId;
    }

    // 生成UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // 获取当前时间戳
    now() {
        return Math.floor(Date.now() / 1000);
    }

    // 添加帖子
    async addPost(content) {
        const transaction = this.db.transaction(['posts'], 'readwrite');
        const store = transaction.objectStore('posts');
        
        const post = {
            content: content,
            status: 'pending', // 默认待审核
            likes: 0,
            reports: 0,
            created_at: this.now(),
            visitor_id: this.getVisitorId()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(post);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 获取帖子列表
    async getPosts(status = 'approved', page = 1, pageSize = 20) {
        const transaction = this.db.transaction(['posts'], 'readonly');
        const store = transaction.objectStore('posts');
        const index = store.index('status');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(status);
            request.onsuccess = () => {
                const posts = request.result;
                // 按创建时间倒序排列
                posts.sort((a, b) => b.created_at - a.created_at);
                
                // 分页
                const offset = (page - 1) * pageSize;
                const paginatedPosts = posts.slice(offset, offset + pageSize);
                
                resolve({
                    page: page,
                    pageSize: pageSize,
                    list: paginatedPosts,
                    total: posts.length
                });
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 点赞帖子
    async likePost(postId) {
        const visitorId = this.getVisitorId();
        
        // 检查是否已经点赞
        const hasLiked = await this.hasLiked(postId, visitorId);
        if (hasLiked) {
            throw new Error('你已经点过赞了');
        }
        
        const transaction = this.db.transaction(['likes', 'posts'], 'readwrite');
        
        // 添加点赞记录
        const likesStore = transaction.objectStore('likes');
        const likeRecord = {
            post_id: postId,
            visitor_id: visitorId,
            created_at: this.now()
        };
        
        return new Promise((resolve, reject) => {
            const likeRequest = likesStore.add(likeRecord);
            likeRequest.onsuccess = () => {
                // 更新帖子点赞数
                const postsStore = transaction.objectStore('posts');
                const getRequest = postsStore.get(postId);
                getRequest.onsuccess = () => {
                    const post = getRequest.result;
                    if (post) {
                        post.likes += 1;
                        const updateRequest = postsStore.put(post);
                        updateRequest.onsuccess = () => resolve();
                        updateRequest.onerror = () => reject(updateRequest.error);
                    } else {
                        reject(new Error('帖子不存在'));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            };
            likeRequest.onerror = () => reject(likeRequest.error);
        });
    }

    // 检查是否已点赞
    async hasLiked(postId, visitorId) {
        const transaction = this.db.transaction(['likes'], 'readonly');
        const store = transaction.objectStore('likes');
        const index = store.index('post_id');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(postId);
            request.onsuccess = () => {
                const likes = request.result;
                const hasLiked = likes.some(like => like.visitor_id === visitorId);
                resolve(hasLiked);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 举报帖子
    async reportPost(postId, reason = '') {
        const transaction = this.db.transaction(['reports', 'posts'], 'readwrite');
        
        // 添加举报记录
        const reportsStore = transaction.objectStore('reports');
        const reportRecord = {
            post_id: postId,
            reason: reason.slice(0, 200), // 限制长度
            visitor_id: this.getVisitorId(),
            created_at: this.now()
        };
        
        return new Promise((resolve, reject) => {
            const reportRequest = reportsStore.add(reportRecord);
            reportRequest.onsuccess = () => {
                // 更新帖子举报数
                const postsStore = transaction.objectStore('posts');
                const getRequest = postsStore.get(postId);
                getRequest.onsuccess = () => {
                    const post = getRequest.result;
                    if (post) {
                        post.reports += 1;
                        const updateRequest = postsStore.put(post);
                        updateRequest.onsuccess = () => resolve();
                        updateRequest.onerror = () => reject(updateRequest.error);
                    } else {
                        reject(new Error('帖子不存在'));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            };
            reportRequest.onerror = () => reject(reportRequest.error);
        });
    }

    // 记录访问统计
    async recordVisit(pagePath = '/') {
        const transaction = this.db.transaction(['analytics'], 'readwrite');
        const store = transaction.objectStore('analytics');
        
        const visit = {
            visitor_id: this.getVisitorId(),
            user_agent: navigator.userAgent,
            device_model: this.getDeviceModel(),
            browser_kernel: this.getBrowserKernel(),
            page_path: pagePath,
            referer: document.referrer || '',
            created_at: this.now()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(visit);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 获取设备型号
    getDeviceModel() {
        const ua = navigator.userAgent.toLowerCase();
        
        if (ua.includes('iphone')) {
            const match = ua.match(/iphone os (\d+_\d+)/);
            return match ? `iPhone (iOS ${match[1].replace('_', '.')})` : 'iPhone';
        } else if (ua.includes('ipad')) {
            const match = ua.match(/ipad.*os (\d+_\d+)/);
            return match ? `iPad (iOS ${match[1].replace('_', '.')})` : 'iPad';
        } else if (ua.includes('android')) {
            const match = ua.match(/android [\d.]+; ([^)]+)/);
            return match ? `Android (${match[1]})` : 'Android Device';
        } else if (ua.includes('windows')) {
            return 'Windows PC';
        } else if (ua.includes('macintosh') || ua.includes('mac os')) {
            return 'Mac';
        } else if (ua.includes('linux')) {
            return 'Linux PC';
        }
        
        return 'Unknown';
    }

    // 获取浏览器内核
    getBrowserKernel() {
        const ua = navigator.userAgent.toLowerCase();
        
        if (ua.includes('chrome') && !ua.includes('edg')) {
            return 'Chromium';
        } else if (ua.includes('firefox')) {
            return 'Gecko (Firefox)';
        } else if (ua.includes('safari') && !ua.includes('chrome')) {
            return 'WebKit (Safari)';
        } else if (ua.includes('edg')) {
            return 'Chromium (Edge)';
        } else if (ua.includes('opera') || ua.includes('opr')) {
            return 'Chromium (Opera)';
        }
        
        return 'Unknown';
    }

    // 获取统计数据
    async getAnalytics(timeRange = 24) {
        const since = this.now() - (timeRange * 60 * 60);
        
        const transaction = this.db.transaction(['analytics'], 'readonly');
        const store = transaction.objectStore('analytics');
        const index = store.index('created_at');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll();
            request.onsuccess = () => {
                const visits = request.result.filter(v => v.created_at > since);
                
                // 计算统计数据
                const totalVisits = visits.length;
                const uniqueVisitors = new Set(visits.map(v => v.visitor_id)).size;
                
                // 设备统计
                const deviceStats = {};
                visits.forEach(v => {
                    deviceStats[v.device_model] = (deviceStats[v.device_model] || 0) + 1;
                });
                
                // 浏览器统计
                const browserStats = {};
                visits.forEach(v => {
                    browserStats[v.browser_kernel] = (browserStats[v.browser_kernel] || 0) + 1;
                });
                
                resolve({
                    totalVisits,
                    uniqueVisitors,
                    deviceStats: Object.entries(deviceStats).map(([model, count]) => ({ device_model: model, count })),
                    browserStats: Object.entries(browserStats).map(([kernel, count]) => ({ browser_kernel: kernel, count })),
                    recentVisits: visits.slice(0, 50)
                });
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 管理员功能 - 获取待审核帖子
    async getPendingPosts() {
        return this.getPosts('pending', 1, 100);
    }

    // 管理员功能 - 审核帖子
    async approvePost(postId) {
        return this.updatePostStatus(postId, 'approved');
    }

    // 管理员功能 - 拒绝帖子
    async rejectPost(postId) {
        return this.updatePostStatus(postId, 'rejected');
    }

    // 管理员功能 - 删除帖子
    async deletePost(postId) {
        const transaction = this.db.transaction(['posts', 'likes', 'reports'], 'readwrite');
        
        return new Promise((resolve, reject) => {
            // 删除相关数据
            const postsStore = transaction.objectStore('posts');
            const likesStore = transaction.objectStore('likes');
            const reportsStore = transaction.objectStore('reports');
            
            // 删除帖子
            const deletePostRequest = postsStore.delete(postId);
            deletePostRequest.onsuccess = () => {
                // 删除相关点赞和举报记录
                const deleteLikesRequest = likesStore.index('post_id').openCursor(IDBKeyRange.only(postId));
                deleteLikesRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
                
                const deleteReportsRequest = reportsStore.index('post_id').openCursor(IDBKeyRange.only(postId));
                deleteReportsRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
                
                resolve();
            };
            deletePostRequest.onerror = () => reject(deletePostRequest.error);
        });
    }

    // 更新帖子状态
    async updatePostStatus(postId, status) {
        const transaction = this.db.transaction(['posts'], 'readwrite');
        const store = transaction.objectStore('posts');
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(postId);
            getRequest.onsuccess = () => {
                const post = getRequest.result;
                if (post) {
                    post.status = status;
                    const updateRequest = store.put(post);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('帖子不存在'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }
}

// 全局数据库实例
window.db = new Database();
