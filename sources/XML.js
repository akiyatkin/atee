import { createRequire } from "module"
const require = createRequire(import.meta.url)
const { XMLParser } = require("fast-xml-parser");
import readChars from "/-sources/readChars.js"


const XML = {}



XML.getStringDate = async (url, attr, headers = {}) => {
	const line = await readChars(url, 1000, headers)
	const reg = new RegExp(`${attr}="([^"]+)"`)
	const dateMatch = line.match(reg);
	const dateString = dateMatch ? dateMatch[1] : null;
	if (!dateString) return false	
	return date
}


XML.getsrc = src => {
	return String(src).replaceAll(',','&comma;')
}
XML.getarray = picture => {
	if (Array.isArray(picture)) {
		picture = picture.map(p => XML.getsrc(p))
	} else if (picture) {
		picture = [XML.getsrc(picture)]
	} else {
		picture = []
	}
	return picture
}

XML.parse = async (SRC, headers) => {
	const parser = new XMLParser({ignoreAttributes: false})
	const xmltext = await readChars(SRC, 10 ** 10, headers)
	if (!xmltext) return {msg: 'Не удалось скачать прайс ' + src, result: 0}
	const xmldata = parser.parse(xmltext)
	return xmldata
}


XML.getSheet = (sheets, title, head = []) => {
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


export default XML