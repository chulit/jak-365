// write-sheet.mjs — menulis ulang semua tab Google Sheet dari
// sheets-template/*.csv (sumber: scripts/generate-sheet-data.mjs).
// Membuat dulu 5 tab baru (Mitra, Kanal, Katalog, Penugasan, Ringkasan),
// lalu tiap tab: CLEAR seluruh extent lama, lalu UPDATE per chunk 150
// baris dengan valueInputOption RAW (supaya "2026-07" tidak berubah
// jadi "2026-7").
// Jalankan: node scripts/write-sheet.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SHEET_ID = '1v8velGd7wZflo82bX0oB7fcisckQve67n6jppNBdSmg'
const CLI = '/opt/hatch/bin/hatch_gws_cli'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else { field += ch }
    } else if (ch === '"') { inQuotes = true }
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else { field += ch }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((c) => c.trim() !== '')) rows.push(row)
  }
  return rows
}

function gws(args) {
  return execFileSync(CLI, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function colLetter(n) {
  let s = ''
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
  return s
}

function addSheets(titles) {
  const requests = titles.map((title) => ({ addSheet: { properties: { title } } }))
  gws(['sheets', 'spreadsheets', 'batchUpdate',
    '--params', JSON.stringify({ spreadsheetId: SHEET_ID }),
    '--json', JSON.stringify({ requests })])
  console.log('Tab baru dibuat:', titles.join(', '))
}

function clearTab(tab, range) {
  gws(['sheets', 'spreadsheets', 'values', 'clear',
    '--params', JSON.stringify({ spreadsheetId: SHEET_ID, range: `${tab}!${range}` })])
}

function updateRange(range, values) {
  gws(['sheets', 'spreadsheets', 'values', 'update',
    '--params', JSON.stringify({ spreadsheetId: SHEET_ID, range, valueInputOption: 'RAW' }),
    '--json', JSON.stringify({ range, majorDimension: 'ROWS', values })])
}

function writeTab(tab, csvFile, chunkRows = 150) {
  const rows = parseCsv(readFileSync(join(ROOT, 'sheets-template', csvFile), 'utf8'))
  const nCols = rows[0].length
  const lastCol = colLetter(nCols)
  // Clear extent lama secara murah hati (data lama bisa lebih lebar/tinggi).
  clearTab(tab, `A1:${lastCol}2000`)
  for (let i = 0; i < rows.length; i += chunkRows) {
    const chunk = rows.slice(i, i + chunkRows)
    const range = `${tab}!A${i + 1}:${lastCol}${i + chunk.length}`
    updateRange(range, chunk)
    console.log(`  ${tab}: baris ${i + 1}–${i + chunk.length} ditulis`)
  }
}

addSheets(['Mitra', 'Kanal', 'Katalog', 'Penugasan', 'Ringkasan'])
writeTab('Transaksi', 'Transaksi.csv')
writeTab('UMKM', 'UMKM.csv')
writeTab('Mitra', 'Mitra.csv')
writeTab('Kanal', 'Kanal.csv')
writeTab('Katalog', 'Katalog.csv')
writeTab('Penugasan', 'Penugasan.csv')
writeTab('Klik_Link', 'Klik_Link.csv')
writeTab('Target', 'Target.csv')
writeTab('Ringkasan', 'Ringkasan.csv')
console.log('SELESAI — semua tab ditulis dari sheets-template/*.csv')
