const crypto = require('crypto');
const config = require('../config');

// 使用环境变量中的加密密钥，如果没有则使用默认值（生产环境必须设置）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * 加密敏感数据
 * @param {string} text - 要加密的文本
 * @returns {string} - 加密后的字符串（格式：iv:encryptedData）
 */
function encrypt(text) {
    if (!text) {
        return null;
    }

    try {
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        throw new Error('Encryption failed: ' + error.message);
    }
}

/**
 * 解密敏感数据
 * @param {string} encryptedText - 加密的文本（格式：iv:encryptedData）
 * @returns {string} - 解密后的原始文本
 */
function decrypt(encryptedText) {
    if (!encryptedText) {
        return null;
    }

    try {
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const parts = encryptedText.split(':');

        if (parts.length !== 2) {
            throw new Error('Invalid encrypted text format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        throw new Error('Decryption failed: ' + error.message);
    }
}

module.exports = {
    encrypt,
    decrypt,
};

