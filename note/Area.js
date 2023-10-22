const Area = {}
// const splice = (str, index, count, add) => {
// 	if (index < 0) {
// 		index += str.length;
// 		if (index < 0)
// 			index = 0;
// 	}
// 	return str.slice(0, index) + (add || "") + str.slice(index + count);
// }

const getStartline = (text, pos) => {
	let startline = pos // find start of the current line
	while (startline > 0 && text[startline - 1] != '\n') startline--
	if (text[pos - 1] != '\t') {
		while (startline < text.length && (text[startline] == '\t' || text[startline] == ' ')) startline++
	}
	return startline
}
const getEndline = (text, pos) => {
	let endline = pos // find start of the current line
	while (endline < text.length && text[endline] != '\n') endline++	
	return endline
}

Area.keydown = async (area, e) => {
	if (e.keyCode === 36) { //Home
		const text = area.value
		const startlineFromEnd = getStartline(text, area.selectionEnd)
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
						const startlineFromStart = getStartline(text, area.selectionStart)
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
					const startlineFromStart = getStartline(text, area.selectionStart)
					area.selectionStart = startlineFromStart
				}
				
			}
		}
	} else if (e.keyCode === 35) { //End
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

	} else if (e.keyCode === 13) { //Enter
		let r = false
		if (area.selectionStart == area.selectionEnd) {
			
			//const sel = getStartline(text, area.selectionStart)

			let sel = area.selectionStart - 1 // find start of the current line
			const text = area.value
			while (sel > 0 && text[sel - 1] != '\n') sel--
			const lineStart = sel
			while (text[sel] == ' ' || text[sel]=='\t') sel++
			if (sel > lineStart) { // Insert carriage return and indented text
				r = true
				document.execCommand('insertText', false, "\n" + text.substr(lineStart, sel - lineStart))
			}
		}
		if (!r) {
			document.execCommand('insertText', false, "\n")
		}
	} else if (e.keyCode === 9) { // Tab newinput
		if (area.selectionStart == area.selectionEnd) {
			if (!e.shiftKey) {
				document.execCommand('insertText', false, "\t")
				//area.dispatchEvent(new Event('input', { bubbles: true, cancelable: true}))
			} else {
				if (area.selectionStart > 0 && area.value[area.selectionStart - 1] == '\t') {
					document.execCommand('delete')
					//area.dispatchEvent(new Event('input', { bubbles: true, cancelable: true}))
				}
			}
		} else {
		
			let selStart = area.selectionStart
			let selEnd = area.selectionEnd
			const orgEnd = area.selectionEnd
			const text = area.value

			while (selStart > 0 && text[selStart-1] != '\n') selStart--
			while (selEnd > 0 && text[selEnd-1] != '\n' && selEnd < text.length) selEnd++


			let lines = text.substr(selStart, selEnd - selStart).split('\n') // Get selected text
			let add = 0
			for (let i = 0; i < lines.length; i++) { // Insert tabs
				if (i == lines.length-1 && lines[i].length == 0) continue; // Don't indent last line if cursor at start of line
				if (e.shiftKey) { // Tab or Shift+Tab?
					if (lines[i].startsWith('\t')) {
						add = add - 1
						lines[i] = lines[i].substr(1)
					} else if (lines[i].startsWith("    ")) {
						add = add - 4
						lines[i] = lines[i].substr(4)
					}
				}
				else {
					add = add + 1
					lines[i] = "\t" + lines[i]
				}
			}
			lines = lines.join('\n')
			area.selectionStart = selStart
			area.selectionEnd = selStart + lines.length - add
			document.execCommand('insertText', false, lines)
			area.selectionStart = selStart
			area.selectionEnd = orgEnd + add
		}
	}
}
export default Area