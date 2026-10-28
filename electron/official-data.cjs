function normalizeUrl(value = '') {
  return value.startsWith('//') ? `https:${value}` : value.replace(/^http:/, 'https:')
}

const CAR_FAMILIES = [
  { key: 'source-star', name: '源极之星EXA', baseId: 't1', matches: (name) => /^源极之星(?:EXA|[\s-])/.test(name), skin: (name) => name.replace(/^源极之星(?:EXA)?[\s-]*/, '') },
  { key: 'sequence-future', name: '序列未来LYR', baseId: 't2', matches: (name) => /^序列未来(?:LYR|[\s-])/.test(name), skin: (name) => name.replace(/^序列未来(?:LYR)?[\s-]*/, '') },
  { key: 'sirius', name: '天狼星', baseId: 'a108', matches: (name) => /^天狼星(?:$|[\s-])/.test(name), skin: (name) => name.replace(/^天狼星[\s-]*/, '') },
  { key: 'chrono-messenger', name: 'S-时序使者', baseId: 'a230', matches: (name) => /^(?:S-)?时序(?:使者)?(?:$|[\s-])/.test(name), skin: (name) => name.replace(/^(?:S-)?时序(?:使者)?[\s-]*/, '') },
  { key: 'commander', name: '指挥官SPX', baseId: 'a81', matches: (name) => /^指挥官(?:SPX|[\s-])/.test(name), skin: (name) => name.replace(/^指挥官(?:SPX)?[\s-]*/, '') },
  { key: 'lamborghini-rac', name: '兰博基尼RAC', baseId: 'a160', matches: (name) => /^兰博基尼(?:RAC|[\s-])/.test(name), skin: (name) => name.replace(/^兰博基尼(?:RAC)?[\s-]*/, '') },
  { key: 'mclaren', name: '迈凯伦600LT', baseId: 'a115', matches: (name) => /^迈凯伦(?:600LT|[\s-])/.test(name), skin: (name) => name.replace(/^迈凯伦(?:600LT)?[\s-]*/, '') },
  { key: 'bugatti', name: '布加迪BOLIDE', baseId: 'a314', matches: (name) => /^布加迪(?:BOLIDE|[\s-])/.test(name), skin: (name) => name.replace(/^布加迪(?:BOLIDE)?[\s-]*/, '') },
  { key: 'aston-martin', name: '阿斯顿马丁Valkyrie', baseId: 'a353', matches: (name) => /^阿斯顿马丁(?:Valkyrie|[\s-])/.test(name), skin: (name) => name.replace(/^阿斯顿马丁(?:Valkyrie)?[\s-]*/, '') },
]

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function leagueFamilies(cars) {
  const families = new Map()
  for (const car of cars) {
    const match = car.fullName.match(/^S-([^\s-]+)/)
    if (!match) continue
    const stem = match[1].replace(/皮肤$/, '')
    const original = cars.find((candidate) => candidate.fullName === `S-${stem}`)
    if (!original || families.has(stem)) continue
    const escaped = escapePattern(stem)
    families.set(stem, {
      key: `league-${stem}`,
      name: `S-${stem}`,
      baseId: original.sourceId,
      matches: (name) => new RegExp(`^(?:S-)?${escaped}(?:皮肤)?(?:$|[\\s-])`).test(name) || new RegExp(`^赛车皮肤-${escaped}(?:$|[\\s-])`).test(name),
      skin: (name) => name.replace(new RegExp(`^(?:赛车皮肤-)?(?:S-)?${escaped}(?:皮肤)?[\\s-]*`), '').trim(),
    })
  }
  return Array.from(families.values())
}

function groupOfficialCars(rawCars) {
  const normalizedCars = rawCars.map((item) => ({
    sourceId: String(item.cid_d3).toLowerCase(),
    fullName: String(item.cm_4e || '').trim(),
    grade: String(item.jb_43 || '其他').toUpperCase(),
    description: item.jj_3b || '',
    cover: normalizeUrl(item.tt_8a || item.slt_3c),
    cutout: normalizeUrl(item.slt_3c || item.tt_8a),
  }))
  const families = [...CAR_FAMILIES, ...leagueFamilies(normalizedCars)]
  const carGroups = new Map()
  for (const item of normalizedCars) {
    const family = families.find((candidate) => candidate.matches(item.fullName))
    if (family) {
      const key = `${item.grade}:family:${family.key}`
      if (!carGroups.has(key)) carGroups.set(key, { baseName: family.name, grade: item.grade, entries: [], family })
      carGroups.get(key).entries.push({ ...item, skinName: item.sourceId === family.baseId ? '原皮' : family.skin(item.fullName) })
      continue
    }
    const firstPart = item.fullName.split(/\s+/)[0]
    const baseName = firstPart.replace(/EXA$/i, '') || item.fullName
    const key = `${item.grade}:${baseName}`
    const skinName = item.fullName === firstPart ? '原皮' : item.fullName.slice(firstPart.length).trim()
    if (!carGroups.has(key)) carGroups.set(key, { baseName, grade: item.grade, entries: [] })
    carGroups.get(key).entries.push({ ...item, skinName })
  }
  return Array.from(carGroups.values()).map((group) => {
    const base = group.entries.find((x) => x.skinName === '原皮') || group.entries[0]
    const skins = group.entries.map((entry, index) => ({
      id: `official-skin-${entry.sourceId}`,
      name: entry.skinName === '原皮' && index > 0 ? entry.fullName : entry.skinName,
      cover: entry.cover,
      cutout: entry.cutout,
    }))
    return {
      id: `official-car-${group.grade.toLowerCase()}-${group.baseName}`,
      name: group.baseName,
      grade: group.grade,
      tags: group.baseName.startsWith('S-') ? ['联赛车'] : [],
      description: base.description,
      skins,
      selectedSkinId: skins[0].id,
    }
  })
}

function normalizeOfficialMaps(rawMaps) {
  return rawMaps.map((item) => ({
    id: `official-map-${item.dtid_87}`,
    name: item.dtm_88,
    star: Number(item.jytg_a3) || 0,
    coverHorizontal: normalizeUrl(item.slt_3c || item.tt_8a),
    coverVertical: normalizeUrl(item.slt_3c || item.tt_8a),
    description: item.jj_3b || '',
  }))
}

module.exports = { normalizeUrl, groupOfficialCars, normalizeOfficialMaps }
