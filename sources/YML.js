import { createRequire } from "module"
import Sources from "/-sources/Sources.js"
const require = createRequire(import.meta.url)
const { XMLParser } = require("fast-xml-parser");
import readChars from "/-sources/readChars.js"
const YML = {}

YML.safeDateParse = (dateString) => {
	if (!dateString || typeof dateString !== 'string') return null;
	try {
		// Удаляем лишние пробелы
		const cleanString = dateString.trim()
		if (!cleanString) return null
		
		// Пытаемся распарсить как ISO строку
		let timestamp = Date.parse(cleanString)
		
		// Если не удалось, пробуем дополнительные форматы
		if (isNaN(timestamp)) {
			// Заменяем пробел на 'T' для ISO-подобных форматов
			const isoLikeString = cleanString.replace(' ', 'T');
			timestamp = Date.parse(isoLikeString);
		}
		
		// Если все еще не удалось, пробуем ручной парсинг для распространенных форматов
		if (isNaN(timestamp)) {
			timestamp = parseCustomFormats(cleanString);
		}

		if (isNaN(timestamp)) return null;


		const date = new Date(timestamp);
		// Проверяем, что дата валидна
		if (!(date instanceof Date && !isNaN(date.getTime()))) return null

		return date
	} catch (error) {
		// В production-коде здесь можно добавить логирование
		console.warn('Ошибка парсинга даты:', error.message);
		return null;
	}
}

YML.getModified = async (url, headers = {}) => {
	const line = await readChars(url, 1000, headers)
	const dateMatch = line.match(/date="([^"]+)"/);
	const dateString = dateMatch ? dateMatch[1] : null;
	if (!dateString) return false	
	const date = YML.safeDateParse(dateString)
	return date
}
YML.getDateLastWeekDay = (weekDay) => { //0 вс
	const date = new Date()
	date.setMilliseconds(0)
	date.setSeconds(0)
	date.setMinutes(0)
	date.setHours(0)
	
	const wd = date.getDay()
	let diff = wd - weekDay
	while (diff < 0) diff += 7
	date.setDate(date.getDate() - diff)
	return date.getTime()
}


YML.getsrc = src => {
	return String(src).replaceAll(',','&comma;')
}


YML.getpicture = picture => {
	if (Array.isArray(picture)) {
		picture = picture.map(p => YML.getsrc(p))
	} else if (picture) {
		picture = [YML.getsrc(picture)]
	} else {
		picture = []
	}
	return picture
}

YML.parse = async (SRC, headers) => {
	const parser = new XMLParser({ignoreAttributes: false})
	
	const xmldata = await readChars(SRC, 10 ** 10, headers)
	//const xmldata = await fetch(SRC, {headers}).then(r => r.text()).catch(e => console.log('Error parse yml', src, e))
	if (!xmldata) return {msg: 'Не удалось скачать прайс ' + src, result: 0}

	const ymldata = parser.parse(xmldata)
	
	
	const offers = ymldata.yml_catalog?.shop?.offers?.offer
	if (!offers) return {msg: 'В прайсе нет данных offers', result: 0}
	if (!ymldata.yml_catalog?.shop?.categories?.category?.length) return {msg: 'В прайсе нет групп', result: 0}

	const tree = {}
	for (const category of ymldata.yml_catalog?.shop?.categories?.category) {
		const parent_id = category['@_parentId'] || false
		const id = category['@_id']
		const name = category.name || category['#text']
		tree[id] = {parent_id, name, id}
	}

	const categories = {}
	for (const id in tree) {
		categories[id] = tree[id].name
	}

	const groups = {}
	for (const id in tree){
		let group = tree[id]
		groups[id] = []
		while (group) {
			groups[id].unshift(group.name)
			group = tree[group.parent_id]
		}
	}

	const date = YML.safeDateParse(ymldata.yml_catalog['@_date'])
	

	return {
		offers, date, 
		date_content:date, //depricated

		 categories, groups}
}




YML.load = async (SRC, {headers = {}, renameCol = col_title => col_title, getHead, getRow, synonyms}) => {
	//
	const {offers, date_content, categories} = await YML.parse(SRC, headers)
	const sheets = []
	for (const offer of offers) {
		if (!offer.param) offer.param = []
		if (!Array.isArray(offer.param)) offer.param = [offer.param]
	}
	const head = getHead(offers)

	for (const offer of offers) {
		const sheet = YML.getSheet(sheets, categories[offer.categoryId], head)
		for (const param of offer.param) {
			param['#text'] = String(param['#text'] || '').trim()
			if (!param['#text']) continue
			const name = YML.getName(param, synonyms, renameCol)

			if (!~sheet.head.indexOf(name)) sheet.head.push(name)
		}
	}

	
	for (const offer of offers) {
		const sheet = YML.getSheet(sheets, categories[offer.categoryId], head)
		const row = getRow(offer, categories[offer.categoryId])
		for (let i = row.length, l = sheet.head.length; i < l; i++ ) {
			const paramname = sheet.head[i]

			const values = offer.param
				.filter(param => YML.getName(param, synonyms, renameCol) == paramname && param['#text'])
				.map(param => param['#text'].replaceAll(',', '&comma;'))
				.join(', ')
			row.push(values || null)

		}
		sheet.rows.push(row)
		
	}
	return {sheets, date_content, result: 1}
}
YML.getSheet = (sheets, title, head = []) => {
	title ||= 'Неизвестная группа'
	let sheet = sheets.find(sheet => sheet.title == title)
	if (sheet) return sheet
	sheet = {
		head: [...head],
		i: sheets.length,
		title,
		rows:[]
	}
	sheets.push(sheet)
	return sheet
}
YML.getName = (param, synonyms, renameCol) => {
	const name = renameCol(param['@_name'] + (param['@_unit'] ?  ', ' + param['@_unit'] : ''))
	for (const rname in synonyms) {
		if (~synonyms[rname].indexOf(name)) return rname
	}
	return name 
}


YML.getFileSrc = f => f['#text'].replaceAll(',','&#44;') + '#' + (f['@_name']||'').replaceAll(',',' ').replaceAll('#',' ')
YML.getPictureSrc = src => src.replaceAll(',','&#44;')
YML.getdoc = doc => {
	if (Array.isArray(doc)) {
		doc = doc.map(p => YML.getFileSrc(p))
	} else if (doc) {
		doc = [YML.getFileSrc(doc)]
	} else {
		doc = []
	}
	return doc
}
YML.loadSheets = async (SRC, callback, headers) => {
	const {
		offers, 
		date_content, //depricated
		date, groups} = await YML.parse(SRC, headers)	
	const sheets = {}
	for (const offer of offers) {
		const categories = groups[offer.categoryId] || []
		const sheet_title = categories.at(-1) || 'Без группы'
		const sheet = sheets[sheet_title] ??= {title:sheet_title, head: [], rows: []}
		const row_index = Sources.sheet.addRow(sheet)
		
		await callback(sheet, row_index, offer)

		const addCell = (title, value) => Sources.sheet.addCell(sheet, row_index, title, value)
		addCell('Группы', categories.join(', '))

		offer.picture ??= []
		if (!Array.isArray(offer.picture)) offer.picture = [offer.picture]		
		addCell('images', offer.picture.filter(src => !~src.indexOf('.mp4')).map(YML.getPictureSrc).join(', '))

		if (!Array.isArray(offer.picture)) offer.picture = [offer.picture]		
		addCell('videos', offer.picture.filter(src => ~src.indexOf('.mp4')).map(YML.getPictureSrc).join(', '))

		offer.file ??= []
		if (!Array.isArray(offer.file)) offer.file = [offer.file]
		offer.doc ??= []
		if (!Array.isArray(offer.doc)) offer.doc = [offer.doc]
		addCell('files', [...offer.file.map(YML.getFileSrc), ...offer.doc.map(YML.getFileSrc)].join(', '))
		
		offer.param ??= []
		if (!Array.isArray(offer.param)) offer.param = [offer.param]
		for (const param of offer.param) {
			const text = String(param['#text'] || '').trim()
			if (!text) continue
			const name = param['@_name'] + (param['@_unit'] ?  ', ' + param['@_unit'] : '')
			if (!name) continue
			addCell(name, text)
		}
		
	}
	return {sheets:Object.values(sheets), 
		date_content, //depricated
		date, result: 1}
}


export default YML