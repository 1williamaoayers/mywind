/**
 * crypto 工具单元测试
 * 
 * 测试 AES-256 加密解密功能
 */

describe('crypto utils', () => {
    let crypto;

    beforeEach(() => {
        jest.resetModules();
        // 设置测试用的加密密钥
        process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!!';
        crypto = require('../../utils/crypto');
    });

    describe('encrypt', () => {
        it('应该成功加密字符串', () => {
            const plainText = '测试密码123';
            const encrypted = crypto.encrypt(plainText);

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe('string');
            expect(encrypted).not.toBe(plainText);
        });

        it('加密结果应该包含 IV 和密文', () => {
            const encrypted = crypto.encrypt('test');
            // 加密结果格式: iv:authTag:encrypted
            const parts = encrypted.split(':');
            expect(parts.length).toBeGreaterThanOrEqual(2);
        });

        it('相同明文每次加密结果应该不同（因为 IV 随机）', () => {
            const plainText = '相同的明文';
            const encrypted1 = crypto.encrypt(plainText);
            const encrypted2 = crypto.encrypt(plainText);

            expect(encrypted1).not.toBe(encrypted2);
        });
    });

    describe('decrypt', () => {
        it('应该成功解密加密的字符串', () => {
            const plainText = '测试密码123!@#';
            const encrypted = crypto.encrypt(plainText);
            const decrypted = crypto.decrypt(encrypted);

            expect(decrypted).toBe(plainText);
        });

        it('应该正确处理中文', () => {
            const plainText = '你好世界，这是中文密码';
            const encrypted = crypto.encrypt(plainText);
            const decrypted = crypto.decrypt(encrypted);

            expect(decrypted).toBe(plainText);
        });

        it('应该正确处理特殊字符', () => {
            const plainText = 'P@ssw0rd!#$%^&*()';
            const encrypted = crypto.encrypt(plainText);
            const decrypted = crypto.decrypt(encrypted);

            expect(decrypted).toBe(plainText);
        });

        it('应该正确处理空字符串', () => {
            const plainText = '';
            const encrypted = crypto.encrypt(plainText);
            const decrypted = crypto.decrypt(encrypted);

            expect(decrypted).toBe(plainText);
        });
    });

    describe('加密安全性', () => {
        it('加密密钥变化时应该无法解密', () => {
            const plainText = '敏感数据';
            const encrypted = crypto.encrypt(plainText);

            // 重置模块并使用不同的密钥
            jest.resetModules();
            process.env.ENCRYPTION_KEY = 'different-key-32-characters!!!!!';
            const newCrypto = require('../../utils/crypto');

            // 使用不同密钥解密应该失败或返回错误结果
            expect(() => {
                newCrypto.decrypt(encrypted);
            }).toThrow();
        });
    });
});
