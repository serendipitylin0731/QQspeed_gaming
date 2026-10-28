function normalizeUrl(value = '') {
  return value.startsWith('//') ? `https:${value}` : value.replace(/^http:/, 'https:')
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
  const carGroups = new Map()
  for (const item of normalizedCars) {
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
