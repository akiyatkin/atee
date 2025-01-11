
import { createRequire } from "module"
const require = createRequire(import.meta.url)
const { XMLParser } = require("fast-xml-parser");

const YML = {}
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
YML.getfile = file => {
	return String(file['#text']).replaceAll(',','&comma;') + '#' + file['@_name']
}
YML.getdoc = doc => {
	if (Array.isArray(doc)) {
		doc = doc.map(p => YML.getfile(p))
	} else if (doc) {
		doc = [YML.getfile(doc)]
	} else {
		doc = []
	}
	return doc
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
YML.getSheet = (sheets, title) => {
	let sheet = sheets.find(sheet => sheet.title == title)
	if (sheet) return sheet
	sheet = {
		title,
		head:['Позиция', 'Цена', 'Наименование', 'Описание', 'Ссылки на картинки', 'Ссылки на файлы'],
		rows:[]
	}
	sheets.push(sheet)
	
	//sheet.head.push(...params)
	return sheet
}
YML.parse = async (SRC, headers) => {
	const parser = new XMLParser({ignoreAttributes: false})
	const xmldata = await fetch(SRC, {headers}).then(r => r.text()).catch(e => console.log('Прайс Carddex error parse', src, e))
	if (!xmldata) return {msg: 'Не удалось скачать прайс ' + src, result: 0}

	const ymldata = parser.parse(xmldata)
	
	
	const offers = ymldata.yml_catalog?.shop?.offers?.offer
	if (!offers) return {msg: 'В прайсе нет данных offers', result: 0}
	if (!ymldata.yml_catalog?.shop?.categories?.category?.length) return {msg: 'В прайсе нет групп', result: 0}

	const categories = {}
	for (const category of ymldata.yml_catalog?.shop?.categories?.category) {
		categories[category['@_id']] = category.name
	}
	const date_content = new Date(ymldata.yml_catalog['@_date'])

	return {offers, date_content, categories}
}
YML.load = async (SRC, headers = {}) => {
	const {offers, date_content, categories} = await YML.parse(SRC, headers)
	
	const sheets = []
	
	
	// for (const offer of offers) {
	// 	if (!offer.param) offer.param = []
	// 	if (!Array.isArray(offer.param)) offer.param = [offer.param]
	// 	offer.param.forEach(val => {
	// 		allparams[val['@_name']] = true
	// 	})
	// }
	

	for (const offer of offers) {
		const sheet_name = categories[offer.categoryId] || 'Неизвестная группа'
		const sheet = YML.getSheet(sheets, sheet_name)
		if (!offer.param) offer.param = []
		if (!Array.isArray(offer.param)) offer.param = [offer.param]
		for (const param of offer.param) {
			param['#text'] = String(param['#text']).trim()
			if (~sheet.head.indexOf(param['@_name'])) continue
			sheet.head.push(param['@_name'])
		}
	}

	for (const offer of offers) {
		
		const sheet_name = categories[offer.categoryId] || 'Неизвестная группа'
		const sheet = YML.getSheet(sheets, sheet_name)

		const doc = YML.getdoc(offer.doc)
		const picture = YML.getpicture(offer.picture)

		const row = [
			offer.sku, 
			offer.price, 
			offer.name, 
			offer.description,
			picture.join(','),
			doc.join(',')
		]

		for (let i = 5, l = sheet.head.length; i < l; i++ ) {
			const paramname = sheet.head[i]
			const values = offer.param
		 		.filter(val => val['@_name'] == paramname && val['#text'])
		 		.map(val => val['#text'].replaceAll(',', '&comma;'))
		 		.join(', ')
		 	row.push(values || null)
		}
		sheet.rows.push(row)
	}
	return {sheets, date_content, result: 1}
}

export default YML