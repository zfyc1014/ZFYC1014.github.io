# Supabase集成部署指南

## 🚀 快速开始

### 1. 创建Supabase项目

1. 访问 [Supabase官网](https://supabase.com)
2. 注册/登录账户
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - **Name**: `留声洞` 或 `echo-hole`
   - **Database Password**: 设置一个强密码
   - **Region**: 选择离您最近的区域

### 2. 配置数据库

1. 在Supabase Dashboard中，进入 **SQL Editor**
2. 复制 `supabase-schema.sql` 文件中的所有内容
3. 粘贴到SQL编辑器中并执行
4. 确认所有表都已创建成功

### 3. 获取API密钥

1. 在Supabase Dashboard中，进入 **Settings** → **API**
2. 复制以下信息：
   - **Project URL**: `https://dlqyccubqovzfuljszmj.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 4. 更新代码配置

在 `js/supabase-db.js` 文件中，确保以下配置正确：

```javascript
this.supabaseUrl = 'https://dlqyccubqovzfuljszmj.supabase.co';
this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRscXljY3VicW92emZ1bGpzem1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNjEyMjYsImV4cCI6MjA3MjczNzIyNn0.ctYN4P9_AfSYbA3bpAeUt58qrdttdk69PGBQMtaG9Tg';
```

### 5. 部署到GitHub Pages

1. 将所有文件上传到GitHub仓库
2. 在仓库设置中启用GitHub Pages
3. 访问生成的GitHub Pages链接

## 📊 数据库表结构

### posts (帖子表)
- `id`: UUID主键
- `content`: 帖子内容 (最大1000字符)
- `status`: 状态 (published/reported/hidden)
- `likes`: 点赞数
- `reports`: 举报数
- `created_at`: 创建时间
- `visitor_id`: 访客ID
- `last_updated`: 最后更新时间

### likes (点赞表)
- `id`: UUID主键
- `post_id`: 帖子ID (外键)
- `visitor_id`: 访客ID
- `created_at`: 创建时间

### reports (举报表)
- `id`: UUID主键
- `post_id`: 帖子ID (外键)
- `reason`: 举报理由
- `visitor_id`: 访客ID
- `created_at`: 创建时间

### analytics (访问统计表)
- `id`: UUID主键
- `visitor_id`: 访客ID
- `ip_address`: IP地址
- `user_agent`: 用户代理
- `device_model`: 设备型号
- `browser_kernel`: 浏览器内核
- `page_path`: 页面路径
- `referer`: 来源页面
- `created_at`: 创建时间

## 🔒 安全配置

### 行级安全性 (RLS)
所有表都已启用RLS，确保数据安全：

- **posts**: 允许所有人读取已发布帖子，插入新帖子
- **likes**: 允许所有人读取和插入点赞记录
- **reports**: 允许所有人插入举报记录
- **analytics**: 允许所有人插入访问统计

### API密钥安全
- 使用 `anon` 公钥，安全用于客户端
- 如需服务端操作，使用 `service_role` 密钥（仅在服务端使用）

## 🔄 实时功能

### 实时订阅
项目已配置实时订阅，支持：
- 新帖子发布实时通知
- 帖子状态变化实时更新
- 访问统计实时监控

### 跨设备同步
- 所有数据存储在Supabase云端
- 支持多设备同时访问
- 数据实时同步

## 📱 功能特性

### 用户功能
- ✅ 直接发布内容，无需审核
- ✅ 实时看到新内容
- ✅ 点赞和举报功能
- ✅ 跨设备数据同步

### 管理员功能
- ✅ 审核被举报的内容
- ✅ 实时访问统计
- ✅ 设备分布分析
- ✅ IP地址统计

## 🛠️ 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查API密钥是否正确
   - 确认Supabase项目状态正常
   - 检查网络连接

2. **实时更新不工作**
   - 确认已执行数据库表创建脚本
   - 检查浏览器控制台错误信息
   - 确认Supabase项目支持实时功能

3. **权限错误**
   - 检查RLS策略是否正确配置
   - 确认API密钥权限设置

### 调试方法

1. 打开浏览器开发者工具
2. 查看Console标签页的错误信息
3. 检查Network标签页的API请求
4. 在Supabase Dashboard中查看数据库日志

## 📈 性能优化

### 数据库优化
- 已创建必要的索引
- 使用分页加载减少数据传输
- 实时订阅只监听必要的变化

### 前端优化
- 使用CDN加载Supabase客户端
- 实现数据缓存机制
- 优化实时更新频率

## 🔧 自定义配置

### 修改管理员账号
在 `js/admin-supabase.js` 中修改：
```javascript
const ADMIN_USERNAME = 'your_username';
const ADMIN_PASSWORD = 'your_password';
```

### 调整实时更新频率
在 `js/admin-supabase.js` 中修改：
```javascript
setInterval(() => {
    // 更新逻辑
}, 5000); // 改为5秒
```

### 自定义统计时间范围
在 `js/supabase-db.js` 中修改：
```javascript
async getAnalytics(timeRange = 24) { // 改为48小时
```

## 📞 技术支持

如遇到问题，可以：
1. 查看Supabase官方文档
2. 检查GitHub Issues
3. 联系项目维护者

---

**注意**: 请妥善保管您的API密钥，不要将其提交到公开的代码仓库中。
