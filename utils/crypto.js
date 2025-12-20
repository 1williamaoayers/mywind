/**
 * 加密工具 - AES-256 对称加密
 * 用于账号密码的安全存储
 */

const crypto = require('crypto');

// 加密算法
const ALGORITHM = 'aes-256-gcm';

// 从环境变量获取密钥，如果没有则生成一个（仅开发环境）
const getEncryptionKey = () => {
    const key = process.env.ENCRYPTION_KEY;
    if (key) {
        // 确保密钥是 32 字节
        return crypto.createHash('sha256').update(key).digest();
    }
    // 开发环境默认密钥（生产环境必须设置环境变量）
    console.warn('[安全] 警告：未设置 ENCRYPTION_KEY 环境变量，使用默认密钥');
    return crypto.createHash('sha256').update('private-wind-ultra-default-key').digest();
};

/**
 * 加密字符串
 * @param {string} text - 明文
 * @returns {string} - 加密后的字符串（iv:authTag:encrypted）
 */
function encrypt(text) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 格式：iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 解密字符串
 * @param {string} encryptedText - 加密字符串
 * @returns {string} - 解密后的明文
 */
function decrypt(encryptedText) {
    try {
        const key = getEncryptionKey();
        const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[加密] 解密失败:', error.message);
        throw new Error('解密失败，密钥可能已更改');
    }
}

/**
 * 生成随机密钥（用于首次部署）
 * @returns {string} - 随机密钥
 */
function generateKey() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
    encrypt,
    decrypt,
    generateKey
};
