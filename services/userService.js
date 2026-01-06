/**
 * 用户服务模块
 * 
 * 功能：
 * 1. 用户注册
 * 2. 用户登录
 * 3. 会话管理
 * 4. 权限验证
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 用户数据存储
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * 用户服务类
 */
class UserService {
    constructor() {
        this.users = new Map();
        this.sessions = new Map();
        this.load();
    }

    /**
     * 加载用户数据
     */
    load() {
        // 加载用户
        if (fs.existsSync(USERS_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
                data.forEach(u => this.users.set(u.id, u));
            } catch (e) {
                console.error('[用户服务] 加载用户失败:', e.message);
            }
        }

        // 加载会话
        if (fs.existsSync(SESSIONS_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
                data.forEach(s => this.sessions.set(s.token, s));
            } catch (e) {
                console.error('[用户服务] 加载会话失败:', e.message);
            }
        }
    }

    /**
     * 保存用户数据
     */
    save() {
        fs.writeFileSync(USERS_FILE, JSON.stringify(Array.from(this.users.values()), null, 2));
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Array.from(this.sessions.values()), null, 2));
    }

    /**
     * 生成ID
     */
    generateId() {
        return 'u_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * 生成Token
     */
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * 密码哈希
     */
    hashPassword(password, salt = null) {
        salt = salt || crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return { salt, hash };
    }

    /**
     * 验证密码
     */
    verifyPassword(password, salt, hash) {
        const result = this.hashPassword(password, salt);
        return result.hash === hash;
    }

    /**
     * 注册用户
     */
    register({ username, password, email, nickname }) {
        // 验证
        if (!username || username.length < 3) {
            throw new Error('用户名至少3个字符');
        }

        if (!password || password.length < 6) {
            throw new Error('密码至少6个字符');
        }

        // 检查用户名是否存在
        for (const user of this.users.values()) {
            if (user.username === username) {
                throw new Error('用户名已存在');
            }
            if (email && user.email === email) {
                throw new Error('邮箱已被注册');
            }
        }

        // 创建用户
        const { salt, hash } = this.hashPassword(password);

        const user = {
            id: this.generateId(),
            username,
            email: email || null,
            nickname: nickname || username,
            passwordHash: hash,
            passwordSalt: salt,
            plan: 'free', // free, pro, premium
            createdAt: new Date().toISOString(),
            lastLoginAt: null
        };

        this.users.set(user.id, user);
        this.save();

        console.log(`[用户服务] 新用户注册: ${username}`);

        return this.sanitizeUser(user);
    }

    /**
     * 用户登录
     */
    login(username, password) {
        // 查找用户
        let user = null;
        for (const u of this.users.values()) {
            if (u.username === username || u.email === username) {
                user = u;
                break;
            }
        }

        if (!user) {
            throw new Error('用户不存在');
        }

        // 验证密码
        if (!this.verifyPassword(password, user.passwordSalt, user.passwordHash)) {
            throw new Error('密码错误');
        }

        // 更新登录时间
        user.lastLoginAt = new Date().toISOString();
        this.save();

        // 创建会话
        const token = this.generateToken();
        const session = {
            token,
            userId: user.id,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天
        };

        this.sessions.set(token, session);
        this.save();

        console.log(`[用户服务] 用户登录: ${username}`);

        return {
            user: this.sanitizeUser(user),
            token
        };
    }

    /**
     * 登出
     */
    logout(token) {
        if (this.sessions.has(token)) {
            this.sessions.delete(token);
            this.save();
            return true;
        }
        return false;
    }

    /**
     * 验证会话
     */
    validateSession(token) {
        const session = this.sessions.get(token);

        if (!session) {
            return null;
        }

        // 检查过期
        if (new Date(session.expiresAt) < new Date()) {
            this.sessions.delete(token);
            this.save();
            return null;
        }

        const user = this.users.get(session.userId);
        return user ? this.sanitizeUser(user) : null;
    }

    /**
     * 获取用户信息
     */
    getUser(userId) {
        const user = this.users.get(userId);
        return user ? this.sanitizeUser(user) : null;
    }

    /**
     * 更新用户信息
     */
    updateUser(userId, updates) {
        const user = this.users.get(userId);
        if (!user) {
            throw new Error('用户不存在');
        }

        if (updates.nickname) user.nickname = updates.nickname;
        if (updates.email) user.email = updates.email;

        this.save();
        return this.sanitizeUser(user);
    }

    /**
     * 修改密码
     */
    changePassword(userId, oldPassword, newPassword) {
        const user = this.users.get(userId);
        if (!user) {
            throw new Error('用户不存在');
        }

        if (!this.verifyPassword(oldPassword, user.passwordSalt, user.passwordHash)) {
            throw new Error('原密码错误');
        }

        const { salt, hash } = this.hashPassword(newPassword);
        user.passwordSalt = salt;
        user.passwordHash = hash;

        this.save();
        return true;
    }

    /**
     * 清理用户信息（移除敏感字段）
     */
    sanitizeUser(user) {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            nickname: user.nickname,
            plan: user.plan,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        };
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            totalUsers: this.users.size,
            activeSessions: this.sessions.size
        };
    }
}

// 单例
let instance = null;

function getUserService() {
    if (!instance) {
        instance = new UserService();
    }
    return instance;
}

/**
 * 认证中间件
 */
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            success: false,
            error: { code: 'NO_TOKEN', message: '未提供认证令牌' }
        });
    }

    const userService = getUserService();
    const user = userService.validateSession(token);

    if (!user) {
        return res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: '令牌无效或已过期' }
        });
    }

    req.user = user;
    next();
}

/**
 * 可选认证中间件（不强制要求登录）
 */
function optionalAuthMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
        const userService = getUserService();
        const user = userService.validateSession(token);
        if (user) {
            req.user = user;
        }
    }

    next();
}

module.exports = {
    UserService,
    getUserService,
    authMiddleware,
    optionalAuthMiddleware
};
