# 留声洞（匿名树洞）

## 🌟 项目简介
一个简单的学校留声洞网页，让你成为学校论坛的创作者，可以直接照搬，但要提前联系QQ3012728

## ✨ 功能特色
- **实时互动**：用户发布内容后立即显示，无需等待审核
- **举报审核**：只有被举报的内容才会进入管理员审核队列
- **匿名投稿**：用户可匿名发布内容，支持最多1000字
- **访问统计**：实时记录访问数据，包括IP地址、设备型号、浏览器内核等
- **点赞举报**：用户可对内容进行点赞或举报
- **实时更新**：新内容自动显示，被举报内容自动隐藏
- **跨设备同步**：基于Supabase的云端数据同步，支持多设备访问
- **响应式设计**：完美支持手机和桌面端访问
- **双重部署**：支持传统服务器和GitHub Pages托管

## 📁 项目结构
- `src/` - 服务端代码（Express + better-sqlite3）
- `index.html` - 主页（用户投稿和浏览）
- `admin.html` - 管理员后台
- `disclaimer.html` - 免责声明页面
- `js/` - 前端JavaScript文件
  - `database.js` - 前端数据库管理（IndexedDB）
  - `supabase-db.js` - Supabase数据库层
  - `app.js` - 应用逻辑（IndexedDB版本）
  - `app-supabase.js` - 应用逻辑（Supabase版本）
  - `admin-supabase.js` - 管理员逻辑（Supabase版本）
- `supabase-schema.sql` - Supabase数据库表结构
- `SUPABASE_SETUP.md` - Supabase集成部署指南

## 🚀 快速开始

### 方式一：传统服务器部署
```bash
# 安装依赖
npm install

# 开发模式
npm run dev
# 浏览器访问 http://localhost:3000

# 生产模式
npm start
```

### 方式二：GitHub Pages部署（推荐）

#### 基础版本（IndexedDB）
1. 将项目文件上传到GitHub仓库
2. 在仓库设置中启用GitHub Pages
3. 访问生成的GitHub Pages链接

#### 高级版本（Supabase云端同步）
1. 创建Supabase项目（参考 `SUPABASE_SETUP.md`）
2. 执行数据库表创建脚本
3. 更新API密钥配置
4. 部署到GitHub Pages
5. 享受真正的跨设备实时同步


## ⚙️ 环境变量配置
- `PORT`: 服务端口，默认 3000
- `ADMIN_USERNAME`: 管理员用户名，默认 admin
- `ADMIN_PASSWORD`: 管理员密码，默认 admin123
- `CORS_ORIGIN`: CORS 允许来源，默认 *
- `DB_PATH`: SQLite 文件路径，默认 data.db
- `IP_SALT`: IP 哈希盐，默认 echo-hole-salt

## 🐳 服务器部署

### Docker 部署
```yaml
# docker-compose.yml
version: '3.8'
services:
  echo-hole:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - ADMIN_USERNAME=your_admin_username
      - ADMIN_PASSWORD=your_strong_password
      - CORS_ORIGIN=https://your-domain.com
      - DB_PATH=/data/data.db
      - IP_SALT=your_random_salt_string
    volumes:
      - ./data:/data
```

### PM2 部署
```bash
# 安装依赖
npm install --omit=dev

# 设置环境变量
export PORT=3000
export ADMIN_USERNAME=your_admin_username
export ADMIN_PASSWORD=your_strong_password
export CORS_ORIGIN=https://your-domain.com
export DB_PATH=./data.db
export IP_SALT=your_random_salt_string

# 启动服务
npx pm2 start src/server.js -n echo-hole
```

## 🌐 GitHub Pages 部署

### 部署步骤
1. **创建GitHub仓库**
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. **上传代码**
   ```bash
   # 将项目文件复制到仓库根目录
   git add .
   git commit -m "Initial commit: GitHub Pages version"
   git push origin main
   ```

3. **配置GitHub Pages**
   - 进入仓库 **Settings** → **Pages**
   - **Source** 选择 **Deploy from a branch**
   - **Branch** 选择 **main**，**Folder** 选择 **/ (root)**
   - 点击 **Save**

4. **访问网站**
   ```
   https://your-username.github.io/your-repo-name/
   ```


## 🔐 管理员功能

### 默认管理员账号
- **用户名**：`admin`
- **密码**：`admin123`
- **访问地址**：`/admin.html`

### 管理功能
- **举报审核**：审核被举报的内容，支持重新发布/隐藏/删除
- **访问统计**：查看访问量、独立访客、IP统计、设备分布等
- **实时监控**：实时查看访问记录和内容更新

## 📊 访问统计功能

### 统计维度
- **总访问量**：记录所有页面访问次数
- **独立访客**：基于访客ID统计唯一用户
- **设备统计**：iPhone、Android、Windows、Mac等设备分布
- **浏览器统计**：Chromium、Safari、Firefox等浏览器分布
- **实时监控**：显示最新的访问记录

## 🎨 界面特色
- **现代化设计**：渐变背景、毛玻璃效果、圆角卡片
- **流畅动画**：悬停效果、按钮动画、加载状态
- **响应式布局**：完美适配各种屏幕尺寸
- **用户体验**：直观的操作流程，友好的错误提示

## ⚠️ 安全建议

### 服务器部署
- 修改默认管理员用户名和密码
- 设置强随机IP哈希盐值
- 限制CORS到具体域名
- 使用HTTPS和反向代理
- 定期备份数据库文件

### GitHub Pages部署
- 修改默认管理员密码
- 了解数据存储在用户本地
- 定期提醒用户备份重要数据

## 🔄 数据管理

### 服务器版本
- 数据存储在SQLite数据库
- 支持数据备份和恢复
- 管理员可导出数据

### GitHub Pages版本
- 数据存储在用户本地IndexedDB
- 清除浏览器数据会丢失内容
- 不同设备间数据不会同步

## 📝 使用说明

### 用户使用
1. 访问主页，阅读免责声明
2. 勾选同意声明，输入内容
3. 点击提交，内容立即发布
4. 浏览实时更新的内容，进行点赞或举报
5. 被举报的内容会自动隐藏，等待管理员审核

### 管理员使用
1. 访问 `/admin.html`
2. 使用默认账号登录admin/admin123
3. 审核被举报的内容（重新发布/隐藏/删除）
4. 查看访问统计和实时监控

## 🤝 贡献指南
欢迎提交Issue和Pull Request来改进项目：
1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request


## 🔥 Supabase集成版本

### 为什么选择Supabase版本？

#### 基础版本（IndexedDB）的限制：
- ❌ 数据存储在用户本地浏览器
- ❌ 不同设备间数据不互通
- ❌ 清除浏览器数据会丢失内容
- ❌ 无法实现真正的多用户互动

#### Supabase版本的优势：
- ✅ **云端数据存储**：数据永久保存
- ✅ **跨设备同步**：手机、电脑、平板数据互通
- ✅ **真正的实时更新**：多用户同时看到最新内容
- ✅ **多用户互动**：支持大量用户同时使用
- ✅ **数据安全**：专业的数据库安全保护
- ✅ **免费使用**：Supabase提供免费额度

### 快速升级到Supabase版本

1. **创建Supabase项目**
   ```bash
   # 访问 https://supabase.com
   # 创建新项目
   ```

2. **配置数据库**
   ```sql
   -- 在Supabase SQL编辑器中执行
   -- 复制 supabase-schema.sql 中的内容
   ```

3. **更新API密钥**
   ```javascript
   // 在 js/supabase-db.js 中更新
   this.supabaseUrl = 'your-project-url';
   this.supabaseKey = 'your-api-key';
   ```

4. **享受真正的动态网站**
   - 数据云端存储
   - 跨设备实时同步
   - 多用户同时互动

### 部署对比

| 功能 | IndexedDB版本 | Supabase版本 |
|------|---------------|--------------|
| 数据存储 | 本地浏览器 | 云端数据库 |
| 跨设备同步 | ❌ | ✅ |
| 多用户互动 | ❌ | ✅ |
| 数据持久性 | ⚠️ | ✅ |
| 实时更新 | 模拟 | 真正实时 |
| 部署难度 | 简单 | 中等 |
| 维护成本 | 低 | 低 |

---

**留声洞** - 就是为了传小道消息[狗头]