import fs from 'fs/promises'
import cproc from '@atee/cproc'
/*
	Нельзя сохранить переходы на новую строку в ячейке, заменяется на пробел
	Оптимальна запись по одной строке, типа лога.
	Шапка записывается только когда файла ещё нет.
*/
const csv = async (file, srcrow, musthave = []) => cproc(csv, file, async () => {
	for (const name of musthave) if (!srcrow[name]) srcrow[name] = ''
	const keys = Object.keys(srcrow).sort()
	const row = {}
	for (const key of keys) row[key] = srcrow[key]
	const t = new Date()
	row.date = t.toLocaleDateString()
	row.time = t.toLocaleTimeString()
	if (await fs.access(file).then(e => false).catch(e => true)) {
		const heads = Object.keys(row).join(';')
		await fs.writeFile(file, '﻿' + heads + "\n").catch(e => console.log(e))
	}
	const values = '"' + Object.values(row).map(v => {
		if (typeof(v) != 'string' && typeof(v) != 'number') {
			v = JSON.stringify(v)
		}
		v = v.replaceAll("\n",' ')
		v = v.replaceAll('"','""')
		v = v.replaceAll(';','";"')	
		return v	
	}).join('";"') + '"'
	await fs.appendFile(file, values + "\n").catch(e => console.log(file, row, e))
}, Date.now())

export default csv