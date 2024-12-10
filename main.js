const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { initGitService } = require('./services/gitService')
const { saveData, loadData } = require('./services/storageService')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // 开发环境使用本地服务器，生产环境使用打包后的文件
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }

  // 开发时打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC通信处理
ipcMain.handle('get-git-logs', async (event, { projectPath, startDate, endDate }) => {
  return await initGitService().getGitLogs(projectPath, startDate, endDate)
})

ipcMain.handle('save-task', async (event, taskData) => {
  return await saveData('tasks', taskData)
})

ipcMain.handle('load-tasks', async () => {
  return await loadData('tasks')
})

ipcMain.handle('save-tasks', async (event, tasks) => {
  return await saveData('tasks', tasks)
})

ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择数据保存目录'
  })
  
  if (!result.canceled) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('settings:save', async (event, settings) => {
  try {
    // 保存设置到配置文件
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2))
    return true
  } catch (err) {
    console.error('保存设置失败:', err)
    throw err
  }
})

ipcMain.handle('settings:load', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json')
    const data = await fs.promises.readFile(settingsPath, 'utf8')
    return JSON.parse(data)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null // 文件不存在时返回 null
    }
    throw err
  }
}) 