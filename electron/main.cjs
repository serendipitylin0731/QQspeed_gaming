const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const { groupOfficialCars, normalizeOfficialMaps } = require('./official-data.cjs')

const MAP_URL = 'https://speedm.qq.com/zlkdatasys/data/map_list/list.json'
const CAR_URL = 'https://speedm.qq.com/zlkdatasys/data/car_list/list.json'

async function getCallbackJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 QQSpeedVault/1.0' } })
  if (!response.ok) throw new Error(`官网返回 ${response.status}`)
  const text = await response.text()
  const start = text.indexOf('(')
  const end = text.lastIndexOf(')')
  if (start < 0 || end <= start) throw new Error('官网数据格式无法识别')
  return JSON.parse(text.slice(start + 1, end))
}

ipcMain.handle('official:sync', async () => {
  const [mapData, carData] = await Promise.all([getCallbackJson(MAP_URL), getCallbackJson(CAR_URL)])
  const rawMaps = Object.values(mapData).find(Array.isArray) || []
  const rawCars = Object.values(carData).find(Array.isArray) || []
  const cars = groupOfficialCars(rawCars)
  return {
    syncedAt: new Date().toISOString(),
    maps: normalizeOfficialMaps(rawMaps),
    cars,
  }
})

ipcMain.handle('app:info', () => ({ version: app.getVersion(), platform: process.platform }))
ipcMain.handle('external:open', (_, url) => {
  if (/^https?:\/\//.test(url)) return shell.openExternal(url)
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#090d18',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#090d18', symbolColor: '#aeb8ca', height: 44 },
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (app.isPackaged) win.loadFile(path.join(__dirname, '../dist/index.html'))
  else win.loadURL('http://127.0.0.1:5173')
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
