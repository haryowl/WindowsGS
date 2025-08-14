    // backend/src/routes/settings.js
    const express = require('express');
    const router = express.Router();
    const asyncHandler = require('../utils/asyncHandler'); // Import your async error handler
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    const { getForwarderLogs, reloadConfig } = require('../services/dataForwarder');

    // Get settings
    router.get('/', asyncHandler(async (req, res) => {
        const settings = {
            // Add your default settings here
            parser: {
                maxPacketSize: 1024,
                validateChecksum: true
            },
            tcp: {
                port: 5000,
                timeout: 30000
            },
            database: {
                backupInterval: 3600, // 1 hour
                maxBackups: 10
            }
        };
        res.json(settings);
    }));

    // Update settings
    router.put('/', asyncHandler(async (req, res) => {
        const newSettings = req.body;
        // Add your settings update logic here
        res.json({ message: 'Settings updated successfully' });
    }));

    // Get backups
    router.get('/backups', asyncHandler(async (req, res) => {
        try {
            const backupsDir = path.join(__dirname, '../../backups');
            
            // Check if directory exists, create it if it doesn't
            try {
                await fs.access(backupsDir);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    await fs.mkdir(backupsDir, { recursive: true });
                } else {
                    throw error;
                }
            }
            
            const files = await fs.readdir(backupsDir);
            const backupFiles = files.filter(file => file.endsWith('.json'));
            
            const backups = await Promise.all(backupFiles.map(async (file) => {
                const filePath = path.join(backupsDir, file);
                const stats = await fs.stat(filePath);
                return {
                    id: file,
                    name: file.replace('.json', ''),
                    size: stats.size,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime
                };
            }));
            
            res.json(backups.sort((a, b) => b.modifiedAt - a.modifiedAt));
        } catch (error) {
            console.error('Error reading backups:', error);
            res.json([]);
        }
    }));

    // Create backup
    router.post('/backups', asyncHandler(async (req, res) => {
        const { name } = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = name || `backup_${timestamp}`;
        const backupsDir = path.join(__dirname, '../../backups');
        const backupPath = path.join(backupsDir, `${backupName}.json`);
        
        // Ensure backups directory exists
        try {
            await fs.access(backupsDir);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(backupsDir, { recursive: true });
            } else {
                throw error;
            }
        }
        
        // Create backup data
        const backupData = {
            timestamp: new Date().toISOString(),
            settings: {
                parser: {
                    maxPacketSize: 1024,
                    validateChecksum: true
                },
                tcp: {
                    port: 5000,
                    timeout: 30000
                }
            }
        };
        
        await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
        res.json({ message: 'Backup created successfully', backupName });
    }));

    // Restore backup
    router.post('/backups/:backupId/restore', asyncHandler(async (req, res) => {
        const { backupId } = req.params;
        const backupPath = path.join(__dirname, '../../backups', backupId);
        
        try {
            const backupData = await fs.readFile(backupPath, 'utf8');
            const parsedData = JSON.parse(backupData);
            // Add restore logic here
            res.json({ message: 'Backup restored successfully' });
        } catch (error) {
            res.status(404).json({ error: 'Backup not found' });
        }
    }));

    // Delete backup
    router.delete('/backups/:backupId', asyncHandler(async (req, res) => {
        const { backupId } = req.params;
        const backupPath = path.join(__dirname, '../../backups', backupId);
        
        try {
            await fs.unlink(backupPath);
            res.json({ message: 'Backup deleted successfully' });
        } catch (error) {
            res.status(404).json({ error: 'Backup not found' });
        }
    }));

    // Get system status
    router.get('/status', asyncHandler(async (req, res) => {
        const status = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: os.cpus().length,
            platform: os.platform(),
            version: process.version,
            pid: process.pid,
            startTime: new Date(Date.now() - process.uptime() * 1000)
        };
        res.json(status);
    }));

    // Get system health
    router.get('/health', asyncHandler(async (req, res) => {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: {
                database: 'healthy',
                memory: process.memoryUsage().heapUsed < 100 * 1024 * 1024 ? 'healthy' : 'warning',
                uptime: process.uptime() > 0 ? 'healthy' : 'error'
            }
        };
        res.json(health);
    }));

    // Export settings
    router.get('/export', asyncHandler(async (req, res) => {
        const settings = {
            parser: {
                maxPacketSize: 1024,
                validateChecksum: true
            },
            tcp: {
                port: 5000,
                timeout: 30000
            }
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=settings.json');
        res.json(settings);
    }));

    // Import settings
    router.post('/import', asyncHandler(async (req, res) => {
        // This would need multer middleware for file upload
        // For now, just return success
        res.json({ message: 'Settings imported successfully' });
    }));

    // Data Forwarder Config Endpoints
    const dataForwarderConfigPath = path.join(__dirname, '../config/dataForwarder.json');

    // Get data forwarder config
    router.get('/data-forwarder', asyncHandler(async (req, res) => {
        let config = { enabled: false, targetUrl: 'http://accessmyship.com:8008/GpsGate/', autoForwardEnabled: false, autoForwardIntervalMinutes: 5, forwardDeviceImeis: [] };
        try {
            const raw = await fs.readFile(dataForwarderConfigPath, 'utf8');
            config = { ...config, ...JSON.parse(raw) };
        } catch (e) {}
        res.json(config);
    }));

    // Update data forwarder config
    router.put('/data-forwarder', asyncHandler(async (req, res) => {
        const newConfig = req.body;
        let config = { enabled: false, targetUrl: 'http://accessmyship.com:8008/GpsGate/', autoForwardEnabled: false, autoForwardIntervalMinutes: 5, forwardDeviceImeis: [] };
        try {
            const raw = await fs.readFile(dataForwarderConfigPath, 'utf8');
            config = { ...config, ...JSON.parse(raw) };
        } catch (e) {}
        config = { ...config, ...newConfig };
        await fs.writeFile(dataForwarderConfigPath, JSON.stringify(config, null, 2));
        reloadConfig();
        res.json({ message: 'Data forwarder config updated', config });
    }));

    // Get data forwarder logs
    router.get('/data-forwarder/logs', asyncHandler(async (req, res) => {
        const logs = getForwarderLogs(50);
        res.json({ logs });
    }));

    module.exports = router;
