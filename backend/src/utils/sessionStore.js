const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');

class SQLiteSessionStore {
    constructor() {
        this.dbPath = path.join(__dirname, '..', '..', 'data', 'sessions.sqlite');
        this.db = null;
        this.init();
    }

    init() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                logger.error('Error opening sessions database:', err);
                return;
            }
            logger.info('Sessions database opened successfully');
            this.createTable();
        });
    }

    createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                userId INTEGER NOT NULL,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                permissions TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                lastAccessed DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        this.db.run(sql, (err) => {
            if (err) {
                logger.error('Error creating sessions table:', err);
            } else {
                logger.info('Sessions table created/verified successfully');
                this.cleanupExpiredSessions();
            }
        });
    }

    set(token, session) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO sessions (token, userId, username, role, permissions, lastAccessed)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            this.db.run(sql, [
                token,
                session.userId,
                session.username,
                session.role,
                JSON.stringify(session.permissions || {})
            ], function(err) {
                if (err) {
                    logger.error('Error storing session:', err);
                    reject(err);
                } else {
                    logger.info('Session stored successfully', { 
                        token: token.substring(0, 8) + '...',
                        userId: session.userId,
                        username: session.username
                    });
                    resolve();
                }
            });
        });
    }

    get(token) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM sessions 
                WHERE token = ? AND lastAccessed > datetime('now', '-24 hours')
            `;
            
            this.db.get(sql, [token], (err, row) => {
                if (err) {
                    logger.error('Error retrieving session:', err);
                    reject(err);
                } else if (!row) {
                    resolve(null);
                } else {
                    // Update last accessed time
                    this.updateLastAccessed(token);
                    
                    const session = {
                        userId: row.userId,
                        username: row.username,
                        role: row.role,
                        permissions: row.permissions ? JSON.parse(row.permissions) : {},
                        createdAt: new Date(row.createdAt)
                    };
                    
                    logger.info('Session retrieved successfully', { 
                        token: token.substring(0, 8) + '...',
                        userId: session.userId,
                        username: session.username
                    });
                    resolve(session);
                }
            });
        });
    }

    delete(token) {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM sessions WHERE token = ?';
            
            this.db.run(sql, [token], function(err) {
                if (err) {
                    logger.error('Error deleting session:', err);
                    reject(err);
                } else {
                    logger.info('Session deleted successfully', { 
                        token: token.substring(0, 8) + '...',
                        changes: this.changes
                    });
                    resolve();
                }
            });
        });
    }

    deleteByUserId(userId) {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM sessions WHERE userId = ?';
            
            this.db.run(sql, [userId], function(err) {
                if (err) {
                    logger.error('Error deleting sessions for user:', err);
                    reject(err);
                } else {
                    logger.info('Sessions deleted for user', { 
                        userId,
                        changes: this.changes
                    });
                    resolve();
                }
            });
        });
    }

    updateLastAccessed(token) {
        const sql = 'UPDATE sessions SET lastAccessed = CURRENT_TIMESTAMP WHERE token = ?';
        this.db.run(sql, [token], (err) => {
            if (err) {
                logger.error('Error updating session last accessed:', err);
            }
        });
    }

    cleanupExpiredSessions() {
        const sql = "DELETE FROM sessions WHERE lastAccessed < datetime('now', '-24 hours')";
        
        this.db.run(sql, function(err) {
            if (err) {
                logger.error('Error cleaning up expired sessions:', err);
            } else if (this.changes > 0) {
                logger.info('Cleaned up expired sessions', { count: this.changes });
            }
        });
    }

    getSessionCount() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT COUNT(*) as count FROM sessions';
            
            this.db.get(sql, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    logger.error('Error closing sessions database:', err);
                } else {
                    logger.info('Sessions database closed successfully');
                }
            });
        }
    }
}

// Create singleton instance
const sessionStore = new SQLiteSessionStore();

// Cleanup expired sessions every hour
setInterval(() => {
    sessionStore.cleanupExpiredSessions();
}, 60 * 60 * 1000);

// Graceful shutdown
process.on('SIGINT', () => {
    sessionStore.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    sessionStore.close();
    process.exit(0);
});

module.exports = sessionStore; 