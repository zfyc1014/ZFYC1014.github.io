// Supabase数据库层 - 实现真正的动态数据同步
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

class SupabaseDatabase {
    constructor() {
        // Supabase配置
        this.supabaseUrl = 'https://dlqyccubqovzfuljszmj.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRscXljY3VicW92emZ1bGpzem1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjEyMjYsImV4cCI6MjA3MjczNzIyNn0.ctYN4P9_AfSYbA3bpAeUt58qrdttdk69PGBQMtaG9Tg';
        
        // 初始化Supabase客户端
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        
        // 实时订阅
        this.realtimeSubscriptions = new Map();
    }

    // 初始化数据库
    async init() {
        try {
            // 测试连接
            const { data, error } = await this.supabase
                .from('posts')
                .select('count')
                .limit(1);
            
            if (error && error.code !== 'PGRST116') { // 表不存在错误
                console.error('Supabase连接失败:', error);
                throw error;
            }
            
            console.log('Supabase连接成功');
            return true;
        } catch (error) {
            console.error('数据库初始化失败:', error);
            throw error;
        }
    }

    // 获取访客ID - 使用Supabase Auth或本地存储
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
        try {
            const post = {
                id: this.generateUUID(),
                content: content,
                status: 'published',
                likes: 0,
                reports: 0,
                created_at: this.now(),
                visitor_id: this.getVisitorId(),
                last_updated: this.now()
            };

            const { data, error } = await this.supabase
                .from('posts')
                .insert([post])
                .select()
                .single();

            if (error) throw error;

            // 触发实时更新事件
            this.triggerRealtimeUpdate('new_post', data);
            return data.id;
        } catch (error) {
            console.error('添加帖子失败:', error);
            throw error;
        }
    }

    // 获取帖子列表
    async getPosts(status = 'published', page = 1, pageSize = 20) {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await this.supabase
                .from('posts')
                .select('*', { count: 'exact' })
                .eq('status', status)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            return {
                page: page,
                pageSize: pageSize,
                list: data || [],
                total: count || 0
            };
        } catch (error) {
            console.error('获取帖子失败:', error);
            throw error;
        }
    }

    // 点赞帖子
    async likePost(postId) {
        try {
            const visitorId = this.getVisitorId();
            
            // 检查是否已点赞
            const { data: existingLike } = await this.supabase
                .from('likes')
                .select('id')
                .eq('post_id', postId)
                .eq('visitor_id', visitorId)
                .single();

            if (existingLike) {
                // 取消点赞
                await this.supabase
                    .from('likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('visitor_id', visitorId);

                // 减少点赞数
                const { data: post } = await this.supabase
                    .from('posts')
                    .select('likes')
                    .eq('id', postId)
                    .single();

                if (post) {
                    await this.supabase
                        .from('posts')
                        .update({ likes: Math.max(0, post.likes - 1) })
                        .eq('id', postId);
                }
            } else {
                // 添加点赞
                await this.supabase
                    .from('likes')
                    .insert([{
                        post_id: postId,
                        visitor_id: visitorId,
                        created_at: this.now()
                    }]);

                // 增加点赞数
                const { data: post } = await this.supabase
                    .from('posts')
                    .select('likes')
                    .eq('id', postId)
                    .single();

                if (post) {
                    await this.supabase
                        .from('posts')
                        .update({ likes: post.likes + 1 })
                        .eq('id', postId);
                }
            }

            return true;
        } catch (error) {
            console.error('点赞失败:', error);
            throw error;
        }
    }

    // 检查是否已点赞
    async hasLiked(postId, visitorId) {
        try {
            const { data, error } = await this.supabase
                .from('likes')
                .select('id')
                .eq('post_id', postId)
                .eq('visitor_id', visitorId)
                .single();

            return !error && data;
        } catch (error) {
            return false;
        }
    }

    // 举报帖子
    async reportPost(postId, reason = '') {
        try {
            // 添加举报记录
            await this.supabase
                .from('reports')
                .insert([{
                    post_id: postId,
                    reason: reason.slice(0, 200),
                    visitor_id: this.getVisitorId(),
                    created_at: this.now()
                }]);

            // 更新帖子状态为已举报
            const { data, error } = await this.supabase
                .from('posts')
                .update({
                    reports: this.supabase.raw('reports + 1'),
                    status: 'reported',
                    last_updated: this.now()
                })
                .eq('id', postId)
                .select()
                .single();

            if (error) throw error;

            // 触发实时更新事件
            this.triggerRealtimeUpdate('post_reported', data);
            return true;
        } catch (error) {
            console.error('举报失败:', error);
            throw error;
        }
    }

    // 记录访问统计
    async recordVisit(pagePath = '/') {
        try {
            const visit = {
                visitor_id: this.getVisitorId(),
                ip_address: this.getClientIP(),
                user_agent: navigator.userAgent,
                device_model: this.getDeviceModel(),
                browser_kernel: this.getBrowserKernel(),
                page_path: pagePath,
                referer: document.referrer || '',
                created_at: this.now()
            };

            await this.supabase
                .from('analytics')
                .insert([visit]);

            return true;
        } catch (error) {
            console.error('记录访问失败:', error);
            // 访问统计失败不应该影响主要功能
            return false;
        }
    }

    // 获取客户端IP地址（模拟）
    getClientIP() {
        const ua = navigator.userAgent;
        const timestamp = Math.floor(Date.now() / (1000 * 60 * 60));
        const hash = this.simpleHash(ua + timestamp);
        return `192.168.${Math.floor(hash / 256)}.${hash % 256}`;
    }

    // 简单哈希函数
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) % 255;
    }

    // 获取设备型号
    getDeviceModel() {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('iphone')) return 'iPhone';
        if (ua.includes('ipad')) return 'iPad';
        if (ua.includes('android')) return 'Android';
        if (ua.includes('windows')) return 'Windows';
        if (ua.includes('mac')) return 'Mac';
        if (ua.includes('linux')) return 'Linux';
        return 'Unknown';
    }

    // 获取浏览器内核
    getBrowserKernel() {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('chrome')) return 'Chromium';
        if (ua.includes('firefox')) return 'Gecko';
        if (ua.includes('safari') && !ua.includes('chrome')) return 'WebKit';
        if (ua.includes('edge')) return 'EdgeHTML';
        return 'Unknown';
    }

    // 获取统计数据
    async getAnalytics(timeRange = 24) {
        try {
            const since = this.now() - (timeRange * 60 * 60);
            const realtimeSince = this.now() - (5 * 60);

            // 获取访问数据
            const { data: visits, error: visitsError } = await this.supabase
                .from('analytics')
                .select('*')
                .gte('created_at', since)
                .order('created_at', { ascending: false });

            if (visitsError) throw visitsError;

            const allVisits = visits || [];
            const realtimeVisits = allVisits.filter(v => v.created_at > realtimeSince);

            // 计算统计数据
            const totalVisits = allVisits.length;
            const uniqueVisitors = new Set(allVisits.map(v => v.visitor_id)).size;
            const uniqueIPs = new Set(allVisits.map(v => v.ip_address)).size;
            const realtimeVisitsCount = realtimeVisits.length;

            // 设备统计
            const deviceStats = {};
            allVisits.forEach(v => {
                deviceStats[v.device_model] = (deviceStats[v.device_model] || 0) + 1;
            });

            // 浏览器统计
            const browserStats = {};
            allVisits.forEach(v => {
                browserStats[v.browser_kernel] = (browserStats[v.browser_kernel] || 0) + 1;
            });

            // IP统计
            const ipStats = {};
            allVisits.forEach(v => {
                ipStats[v.ip_address] = (ipStats[v.ip_address] || 0) + 1;
            });

            return {
                totalVisits,
                uniqueVisitors,
                uniqueIPs,
                realtimeVisits: realtimeVisitsCount,
                deviceStats: Object.entries(deviceStats).map(([model, count]) => ({ device_model: model, count })),
                browserStats: Object.entries(browserStats).map(([kernel, count]) => ({ browser_kernel: kernel, count })),
                ipStats: Object.entries(ipStats).map(([ip, count]) => ({ ip_address: ip, count })),
                recentVisits: allVisits.slice(0, 50)
            };
        } catch (error) {
            console.error('获取统计数据失败:', error);
            throw error;
        }
    }

    // 管理员功能 - 获取被举报的帖子
    async getReportedPosts() {
        return this.getPosts('reported', 1, 100);
    }

    // 管理员功能 - 审核通过帖子
    async approvePost(postId) {
        try {
            const { data, error } = await this.supabase
                .from('posts')
                .update({
                    status: 'published',
                    last_updated: this.now()
                })
                .eq('id', postId)
                .select()
                .single();

            if (error) throw error;

            // 触发实时更新事件
            this.triggerRealtimeUpdate('post_approved', data);
            return data;
        } catch (error) {
            console.error('审核通过失败:', error);
            throw error;
        }
    }

    // 管理员功能 - 隐藏帖子
    async rejectPost(postId) {
        try {
            const { data, error } = await this.supabase
                .from('posts')
                .update({
                    status: 'hidden',
                    last_updated: this.now()
                })
                .eq('id', postId)
                .select()
                .single();

            if (error) throw error;

            // 触发实时更新事件
            this.triggerRealtimeUpdate('post_rejected', data);
            return data;
        } catch (error) {
            console.error('隐藏帖子失败:', error);
            throw error;
        }
    }

    // 管理员功能 - 删除帖子
    async deletePost(postId) {
        try {
            // 删除相关数据
            await this.supabase
                .from('likes')
                .delete()
                .eq('post_id', postId);

            await this.supabase
                .from('reports')
                .delete()
                .eq('post_id', postId);

            const { error } = await this.supabase
                .from('posts')
                .delete()
                .eq('id', postId);

            if (error) throw error;

            // 触发实时更新事件
            this.triggerRealtimeUpdate('post_deleted', { id: postId });
            return true;
        } catch (error) {
            console.error('删除帖子失败:', error);
            throw error;
        }
    }

    // 实时更新机制
    triggerRealtimeUpdate(type, data) {
        const event = new CustomEvent('realtimeUpdate', {
            detail: { type, data }
        });
        window.dispatchEvent(event);
    }

    // 监听实时更新
    onRealtimeUpdate(callback) {
        window.addEventListener('realtimeUpdate', callback);
    }

    // 订阅实时数据变化
    subscribeToRealtime() {
        // 订阅帖子变化
        const postsSubscription = this.supabase
            .channel('posts_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'posts'
            }, (payload) => {
                console.log('帖子数据变化:', payload);
                this.handleRealtimeChange(payload);
            })
            .subscribe();

        this.realtimeSubscriptions.set('posts', postsSubscription);

        // 订阅访问统计变化
        const analyticsSubscription = this.supabase
            .channel('analytics_changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'analytics'
            }, (payload) => {
                console.log('访问统计变化:', payload);
                this.triggerRealtimeUpdate('new_visit', payload.new);
            })
            .subscribe();

        this.realtimeSubscriptions.set('analytics', analyticsSubscription);
    }

    // 处理实时数据变化
    handleRealtimeChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        switch (eventType) {
            case 'INSERT':
                if (newRecord.status === 'published') {
                    this.triggerRealtimeUpdate('new_post', newRecord);
                }
                break;
            case 'UPDATE':
                if (newRecord.status === 'reported' && oldRecord.status === 'published') {
                    this.triggerRealtimeUpdate('post_reported', newRecord);
                } else if (newRecord.status === 'published' && oldRecord.status === 'reported') {
                    this.triggerRealtimeUpdate('post_approved', newRecord);
                } else if (newRecord.status === 'hidden' && oldRecord.status === 'reported') {
                    this.triggerRealtimeUpdate('post_rejected', newRecord);
                }
                break;
            case 'DELETE':
                this.triggerRealtimeUpdate('post_deleted', oldRecord);
                break;
        }
    }

    // 取消订阅
    unsubscribe() {
        this.realtimeSubscriptions.forEach((subscription) => {
            this.supabase.removeChannel(subscription);
        });
        this.realtimeSubscriptions.clear();
    }
}

// 创建全局实例
window.supabaseDb = new SupabaseDatabase();
