const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, clipboard, ipcMain, shell } = require('electron');

const { TOP_LEVEL_MODULE_CODES, generateLicenseArtifact } = require('./generate-license');

const WINDOW_TITLE = 'SCGP 激活码生成工具';

let mainWindow = null;

function ensureSingleInstance() {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
        app.quit();
        return false;
    }

    app.on('second-instance', () => {
        if (!mainWindow) {
            return;
        }

        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }

        mainWindow.focus();
    });

    return true;
}

function getOutputDirectory() {
    const outputDir = path.join(app.getPath('documents'), 'SCGP-License-Generator');
    fs.mkdirSync(outputDir, { recursive: true });
    return outputDir;
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        title: WINDOW_TITLE,
        autoHideMenuBar: true,
        backgroundColor: '#f6f4ef',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function registerIpcHandlers() {
    ipcMain.handle('license:get-config', () => {
        return {
            modules: [...TOP_LEVEL_MODULE_CODES],
            outputDir: getOutputDirectory()
        };
    });

    ipcMain.handle('license:generate', (_event, payload) => {
        try {
            const artifact = generateLicenseArtifact({
                type: payload?.type,
                machineId: payload?.machineId,
                days: payload?.days,
                allowedModules: payload?.allowedModules,
                outputDir: getOutputDirectory(),
                syncPublicKeyToProject: false
            });

            return {
                ok: true,
                artifact
            };
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : '生成激活码失败'
            };
        }
    });

    ipcMain.handle('system:copy-text', (_event, text) => {
        clipboard.writeText(String(text || ''));
        return true;
    });

    ipcMain.handle('system:read-clipboard-text', () => {
        return clipboard.readText();
    });

    ipcMain.handle('shell:show-item-in-folder', (_event, targetPath) => {
        if (!targetPath) {
            return false;
        }

        shell.showItemInFolder(targetPath);
        return true;
    });
}

if (ensureSingleInstance()) {
    app.whenReady().then(() => {
        app.setName(WINDOW_TITLE);
        registerIpcHandlers();
        createMainWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createMainWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
