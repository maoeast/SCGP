const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('licenseGeneratorApi', {
    getConfig: () => ipcRenderer.invoke('license:get-config'),
    generateLicense: (payload) => ipcRenderer.invoke('license:generate', payload),
    copyText: (text) => ipcRenderer.invoke('system:copy-text', text),
    readClipboardText: () => ipcRenderer.invoke('system:read-clipboard-text'),
    revealInFolder: (targetPath) => ipcRenderer.invoke('shell:show-item-in-folder', targetPath)
});
