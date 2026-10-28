const { app, BrowserWindow, ipcMain, shell, protocol, net } = require('electron')
const path = require('path')
const fs = require('fs/promises')
const crypto = require('crypto')
const { pathToFileURL } = require('url')
const { groupOfficialCars, normalizeOfficialMaps } = require('./official-data.cjs')

const MAP_URL = 'https://speedm.qq.com/zlkdatasys/data/map_list/list.json'
const CAR_URL = 'https://speedm.qq.com/zlkdatasys/data/car_list/list.json'
let mediaRoot = ''

protocol.registerSchemesAsPrivileged([{ scheme: 'qqspeed-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }])

function localMediaUrl(kind, fileName) {
  return `qqspeed-media://cache/${kind}/${fileName}`
}

async function ensureCachedImage(remoteUrl, kind) {
  if (!/^https?:\/\//.test(remoteUrl || '')) return remoteUrl || ''
  const source = new URL(remoteUrl)
  const sourceExt = path.extname(source.pathname).toLowerCase()
  const extension = ['.jpg','.jpeg','.png','.webp','.gif'].includes(sourceExt) ? sourceExt : '.img'
  const fileName = `${crypto.createHash('sha256').update(remoteUrl).digest('hex')}${extension}`
  const targetDir = path.join(mediaRoot, kind)
  const target = path.join(targetDir, fileName)
  await fs.mkdir(targetDir, { recursive: true })
  try {
    await fs.access(target)
    return localMediaUrl(kind, fileName)
  } catch {}
  const response = await net.fetch(remoteUrl, { headers: { 'User-Agent': 'Mozilla/5.0 QQSpeedVault/1.0' } })
  if (!response.ok) throw new Error(`图片下载失败 ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const temporary = `${target}.${process.pid}.tmp`
  await fs.writeFile(temporary, bytes)
  try { await fs.rename(temporary, target) } catch {
    await fs.copyFile(temporary, target)
    await fs.unlink(temporary).catch(() => {})
  }
  return localMediaUrl(kind, fileName)
}

async function mapWithConcurrency(items, concurrency, task) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]
      await task(item)
    }
  })
  await Promise.all(workers)
}

async function cacheOfficialMedia(maps, cars) {
  const cached = new Map()
  const jobs = []
  const getCached = (url, kind) => {
    const key = `${kind}:${url}`
    if (!cached.has(key)) cached.set(key, ensureCachedImage(url, kind))
    return cached.get(key)
  }
  for (const track of maps) jobs.push(async () => {
    const cover = await getCached(track.coverHorizontal, 'maps').catch(() => '')
    track.coverHorizontal = cover
    track.coverVertical = cover
  })
  for (const car of cars) for (const skin of car.skins) {
    jobs.push(async () => { skin.cover = await getCached(skin.cover, 'cars').catch(() => '') })
    jobs.push(async () => { skin.cutout = await getCached(skin.cutout, 'cars').catch(() => '') })
  }
  await mapWithConcurrency(jobs, 8, (job) => job())
}

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
  const maps = normalizeOfficialMaps(rawMaps)
  await cacheOfficialMedia(maps, cars)
  return {
    syncedAt: new Date().toISOString(),
    maps,
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
  mediaRoot = path.join(app.getPath('userData'), 'media-cache')
  protocol.handle('qqspeed-media', (request) => {
    const url = new URL(request.url)
    if (url.hostname !== 'cache') return new Response('Not found', { status: 404 })
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const resolved = path.resolve(mediaRoot, relative)
    const allowedRoot = `${path.resolve(mediaRoot)}${path.sep}`
    if (!resolved.startsWith(allowedRoot)) return new Response('Forbidden', { status: 403 })
    return net.fetch(pathToFileURL(resolved).toString())
  })
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
