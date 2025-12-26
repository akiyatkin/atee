import date from "/-words/date.html.js"
const Area = {}
// const splice = (str, index, count, add) => {
// 	if (index < 0) {
// 		index += str.length;
// 		if (index < 0)
// 			index = 0;
// 	}
// 	return str.slice(0, index) + (add || "") + str.slice(index + count);
// }


const TAB = 9
const ENTER = 13
const HOME = 36
const END = 35
const LEFT = 37
const RIGHT = 39
const UP = 38
const DOWN = 40
const A = 65
const PLUS = 107
const MINUS = 109

const setControlMarker = (area, symbol) => {
	area.selectionStart = area.selectionStart - 2
	document.execCommand('insertText', false, '')
	const selStart = area.selectionStart
	const selEnd = area.selectionEnd
	const text = area.value
	let sel = area.selectionEnd - 1 // find start of the current line
	while (sel > 0 && text[sel - 1] != '\n') sel--
	let flineStart = sel
	while (isSpace(text[sel])) sel++
	const slineStart = Math.min(sel, area.selectionEnd)
	let smb = text[slineStart]
	
	if (!~['+','-'].indexOf(smb)) {
		area.selectionStart = slineStart
		area.selectionEnd = slineStart
		document.execCommand('insertText', false, symbol + " ")
		area.selectionStart = selStart + 2
		area.selectionEnd = selEnd + 2
	} else {
		area.selectionStart = slineStart
		area.selectionEnd = slineStart + 1
		document.execCommand('insertText', false, symbol)
		area.selectionStart = selStart
		area.selectionEnd = selEnd
	}
}
Area.getControlT = () => {
	return "	"
}
const setControlT = (area, symbol = 't') => {
	area.selectionStart = area.selectionStart - 2
	document.execCommand('insertText', false, '')
	const selStart = area.selectionStart
	
	const selEnd = area.selectionEnd
	const text = area.value
	let sel = area.selectionEnd - 1 // find start of the current line
	while (sel > 0 && text[sel - 1] != '\n') sel--
	let flineStart = sel
	while (isSpace(text[sel])) sel++
	const slineStart = Math.min(sel, area.selectionEnd)
	let smb = text[slineStart]
	
	
	area.selectionStart = slineStart
	area.selectionEnd = slineStart
	const str = Area.getControlT() + ' '
	document.execCommand('insertText', false, str)
	area.selectionStart = selStart + 2
	area.selectionEnd = selEnd + 2
}
Area.getControlD = () => {
	const date = new Date()
	let month = date.getMonth() + 1
	if (month < 10) month = '0' + month

	let day = date.getDate()
	if (day < 10) day = '0' + day

	const str = day + '.' + month
	return str
}
const setControlD = (area, symbol = 'd') => {
	area.selectionStart = area.selectionStart - 2
	const selStart = area.selectionStart
	const selEnd = area.selectionEnd
	const str = Area.getControlD() + ' '
	document.execCommand('insertText', false, str)
	area.selectionStart = selStart + str.length
	area.selectionEnd = area.selectionStart
}
Area.getControlH = () => {
	const date = new Date()
	
	let hours = date.getHours()
	if (hours < 10) hours = '0' + hours

	let minutes = date.getMinutes()
	if (minutes < 10) minutes = '0' + minutes

	const str = hours + ':' + minutes
	return str
}
const setControlH = (area, symbol = 'm') => {
	area.selectionStart = area.selectionStart - 2
	const selStart = area.selectionStart
	const selEnd = area.selectionEnd

	const str = Area.getControlH() + '#'
	// const date = new Date()
	
	// let hours = date.getHours()
	// if (hours < 10) hours = '0' + hours

	// let minutes = date.getMinutes()
	// if (minutes < 10) minutes = '0' + minutes

	// const str = hours + ':' + minutes + '#'


	document.execCommand('insertText', false, str)
	area.selectionStart = selStart + str.length
	area.selectionEnd = area.selectionStart
}
Area.control = (area) => {
	const symbol = area.value[area.selectionStart - 1]
	
	if (symbol == '+') {
		setControlMarker(area, '+')
	} else if (symbol == '-') {
		setControlMarker(area, '-')
	} else if (symbol == 't') {
		setControlT(area)
	} else if (symbol == 'd') {
		setControlD(area)
	} else if (symbol == 'h') {
		setControlH(area)
	}
}
Area.mousedown = async (area, e) => {
	if (e.detail != 2) return //Правильное выделение ссылок при двойном клике
	const parseLinks = await import('/-note/parseLinks.js').then(r => r.default)
	const marks = parseLinks(area.value)	
	for (const mark of marks) { 
		if (mark.start > area.selectionStart) continue
		if (mark.start + mark.size < area.selectionEnd) continue
		
		area.selectionStart = mark.start
		area.selectionEnd = mark.start + mark.size
	}    
}
const isSpace = (smb) => {
	if (smb == '\t') return true
	if (smb == ' ') return true
}
const getStartline = (text, pos) => {
	let startline = pos // find start of the current line
	while (startline > 0 && text[startline - 1] != '\n') startline--
	return startline
}
const getStartlineWithTabs = (text, pos) => {
	let startline = getStartline(text, pos)
	const step = text.slice(startline, pos)
	if (/\S/.test(step)) { //В тексте до начала есть симвоволы, значит отступ надо сохранить
		while (startline < text.length && (isSpace(text[startline]))) startline++
	}
	// if (!isSpace(text[pos - 1])) { //Сохраняем табуляцию если после символа ищем начало
	// 	while (startline < text.length && (isSpace(text[startline]))) startline++
	// }
	return startline
}
const getStartlineMarker = (text, pos) => {
	//"					  sadf"
	//"{{start}prefix{tabs}}sadf{pos}"
	const start = getStartline(text, pos)
	let step = text.slice(start, pos)
	let tabs = start
	//if (/\S/.test(step)) { //В тексте до начала есть симвоволы, значит отступ надо сохранить
		while (tabs < text.length && /[\s]/.test(text[tabs])) tabs++
	//}
	if (tabs > pos) tabs = pos
	const prefix = text.slice(start, tabs)

	const row = text.slice(tabs, pos)
	//Нужно найти первый пробел с начала строки от tabs до pos
	const space = row.indexOf(' ')
	let marker = row.slice(0, space == -1 ? pos : space)
	if (!~['+','-','*'].indexOf(marker)) marker = ''
	return {start, tabs, prefix, marker}
}
const getEndline = (text, pos) => {
	let endline = pos // find start of the current line
	while (endline < text.length && text[endline] != '\n') endline++	
	return endline
}
// //textarea.addEventListener('paste', function(event) {
// Area.paste = (area, e, pastedText) => {
//     const newline = ~pastedText.indexOf("\n")
    
//     if (!newline) {
// 		const {marker} = getStartlineMarker(pastedText, pastedText.length)
// 		if (marker) { //Во вставке есть маркер, надо заменить
// 			const {start, tabs, prefix, marker} = getStartlineMarker(area.value, area.selectionStart)
// 			if (marker && (area.selectionStart - (marker.length + 1) == tabs)) {
// 				area.selectionStart -= marker.length + 1
// 			}
// 		}
// 	}
// }
Area.keydown = (area, e) => {
	if (e.keyCode === HOME) { //Home
		const text = area.value
		const startlineFromEnd = getStartlineWithTabs(text, area.selectionEnd)
		if (!e.shiftKey) {
			area.selectionStart = area.selectionEnd = startlineFromEnd
		} else {
			if (area.selectionDirection == 'forward') {
				const lines = text.substr(area.selectionStart, area.selectionEnd - area.selectionStart).split('\n') // Get selected text
				if (lines.length == 1) {
					if (startlineFromEnd < area.selectionStart) {
						area.selectionEnd = area.selectionStart
						area.selectionStart = startlineFromEnd
					} else {
						const startlineFromStart = getStartlineWithTabs(text, area.selectionStart)
						area.selectionStart = startlineFromStart
					}
					area.selectionDirection = 'backward'
				} else {
					area.selectionEnd = startlineFromEnd
				}

			} else {
				if (startlineFromEnd < area.selectionStart) {
					area.selectionStart = startlineFromEnd
				} else {
					const startlineFromStart = getStartlineWithTabs(text, area.selectionStart)
					area.selectionStart = startlineFromStart
				}
				
			}
		}
	// } else if (e.keyCode === MINUS) { //Minus
	// 	const selStart = area.selectionStart
	// 	const text = area.value
	// 	if (text[selStart - 1] == '/') {
	// 		area.selectionStart = selStart - 1
	// 		document.execCommand('insertText', false, '')
	// 		setMarker(area, '-')
	// 	// } else if (e.shiftKey) {
	// 	// 	setMarker(area, '-')
	// 	} else {
	// 		document.execCommand('insertText', false, "-")
	// 	}
	// } else if (e.keyCode === PLUS) { //Plus
	// 	const selStart = area.selectionStart
	// 	const text = area.value

	// 	if (text[selStart - 1] == '/') {
	// 		area.selectionStart = selStart - 1
	// 		document.execCommand('insertText', false, '')
	// 		setMarker(area, '+')
	// 	// } else if (e.shiftKey) {
	// 	// 	setMarker(area, '+')
	// 	} else {
	// 		document.execCommand('insertText', false, "+")
	// 	}
	} else if (e.keyCode === END) { //End
		const text = area.value
		const endlineFromEnd = getEndline(text, area.selectionEnd)

		if (!e.shiftKey) {
			area.selectionStart = area.selectionEnd = endlineFromEnd
		} else {
			if (area.selectionDirection == 'forward') {
				const lines = text.substr(area.selectionStart, area.selectionEnd - area.selectionStart).split('\n') // Get selected text
				if (lines.length == 1) {
					//area.selectionStart = area.selectionEnd
					area.selectionEnd = endlineFromEnd
				} else {
					area.selectionEnd = endlineFromEnd
				}
			} else {
				//TODO end в конце первой строки. Найти конец первой строки от начала.
				const endlineFromStart = getEndline(text, area.selectionStart)
				const lines = text.substr(area.selectionStart, area.selectionEnd - area.selectionStart).split('\n') // Get selected text
				if (lines.length == 1) {
					area.selectionStart = area.selectionEnd
					area.selectionEnd = endlineFromStart
					area.selectionDirection = 'forward'
				} else {
					area.selectionStart = endlineFromStart
				}
				
			}
		}

	} else if (e.keyCode === ENTER) { //Enter
		const text = area.value
		let sel = area.selectionStart - 1 // find start of the current line
		const myEnd = area.selectionEnd
		const myStart = area.selectionStart
		if (text[myEnd - 1] == '\n') {
			document.execCommand('insertText', false, "\n")
		} else {
			//const exception = text[myStart - 2] && ~['+','-'].indexOf(text[myStart - 2])
			//if (exception) area.selectionStart = myStart - 2
			//const end

			const {start, tabs, prefix, marker} = getStartlineMarker(area.value, area.selectionStart)

			
			//console.log({start, tabs, prefix, marker})

			if (marker) { //Маркированный список
				// if (area.selectionStart - 2 == tabs) {
				// 	area.selectionStart -= 2
				// 	//document.execCommand('insertText', false, "\n" + prefix)
				// 	document.execCommand('insertText', false, "")
				if (area.selectionStart - 2 == tabs) {
					//area.selectionStart -= 2
					document.execCommand('insertText', false, "\n" + prefix)
				} else {
					document.execCommand('insertText', false, "\n" + prefix + (marker == '+' ? '-' : marker) + ' ')
				}
			// } else if(/^\d+\.$/.test(marker)) { //Нумерованный список
			// 	if (area.selectionStart - (marker.length + 1) == tabs) {
			// 		area.selectionStart -= marker.length + 1
			// 		document.execCommand('insertText', false, "")
			// 	} else {
			// 		document.execCommand('insertText', false, "\n" + prefix + (marker - 1 + 2) + '. ')
			// 	}
			} else {
				document.execCommand('insertText', false, "\n" + prefix)
			}



			// const flineStart = getStartline(text, sel)
			// sel = flineStart
			// // while (sel > 0 && text[sel - 1] != '\n') sel--
			// // let flineStart = sel //Начало строки
			// while (isSpace(text[sel])) sel++
			// const slineStart = Math.min(sel, area.selectionEnd)


			// let smb = text[slineStart]
			// let prefix = ''	
			// if (text[slineStart + 1] == ' ' && ~['+','-'].indexOf(smb) && text[slineStart + 2]) {
			// 	if (text[slineStart + 2].trim()) {
			// 		if (smb == '+') smb = '-'
			// 		prefix = smb + ' '
			// 	} else {
			// 		//area.selectionStart = slineStart
			// 	}
			// }
			// document.execCommand('insertText', false, "\n" + text.substr(flineStart, slineStart - flineStart) + prefix)
		}
	} else if (e.keyCode === TAB) { // Tab newinput
		if (area.selectionStart == area.selectionEnd) {
			if (!e.shiftKey) {
				document.execCommand('insertText', false, "\t")
				//area.dispatchEvent(new Event('input', { bubbles: true, cancelable: true}))
			} else {
				if (area.selectionStart > 0 && isSpace(area.value[area.selectionStart - 1])) {
					document.execCommand('delete')
					//area.dispatchEvent(new Event('input', { bubbles: true, cancelable: true}))
				}
			}
		} else {
		
			let selStart = area.selectionStart
			let selEnd = area.selectionEnd
			let initStart = area.selectionStart
			let initEnd = area.selectionEnd
			const orgEnd = area.selectionEnd
			const text = area.value

			while (selStart > 0 && text[selStart-1] != '\n') selStart--
			while (selEnd > 0 && text[selEnd-1] != '\n' && selEnd < text.length) selEnd++


			let lines = text.substr(selStart, selEnd - selStart).split('\n') // Get selected text
			lines = lines.filter(l => l)
			let add = 0
			for (let i = 0; i < lines.length; i++) { // Insert tabs
				if (e.shiftKey) { // Tab or Shift+Tab?
					if (lines[i].startsWith('\t')) {
						add = add - 1
						lines[i] = lines[i].substr(1)
					} else if (lines[i].startsWith("    ")) {
						add = add - 4
						lines[i] = lines[i].substr(4)
					}
				} else {
					add = add + 1
					lines[i] = "\t" + lines[i]
				}
			}
			const count = lines.length

			lines = lines.join('\n')
			const direction = area.selectionDirection
			area.selectionStart = selStart
			area.selectionEnd = selStart + lines.length - add
			document.execCommand('insertText', false, lines)
			
			if (e.shiftKey) {
				area.selectionStart = (initStart || 0) - (add ? 1 : 0)
				area.selectionEnd = orgEnd + add
			} else {
				area.selectionStart = initStart + 1

				area.selectionEnd = initEnd + count	
			}
			area.selectionDirection = direction
		}
	}
}
export default Area