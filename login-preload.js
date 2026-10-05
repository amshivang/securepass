const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('securePassLogin', {
  action: action => ipcRenderer.invoke('login:action', action),
  onState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('login:state', listener);
    return () => ipcRenderer.removeListener('login:state', listener);
  }
});
