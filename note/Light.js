import parseBrackets from "/-note/parseBrackets.js"
import parseBold from "/-note/parseBold.js"
import escapeText from '/-note/escapeText.js'
import Move from '/-note/Move.js'

const Light = {}
export default Light

Light.area = (note) => `
${escapeText(note.text)}`
Light.view = (note, marks = []) => {
	let {text, cursors, waitchanges = [], isbracket, isbold} = note
	if (isbracket) marks.push(...parseBrackets(text))
	if (isbold) marks.push(...parseBold(text))
	
	cursors = Object.values(cursors)

	// [2,3,4,5] - надо подсветить 2 после применения 3,4,5
	const lastchange = waitchanges[waitchanges.length - 1]
	
		
	const changes = [...waitchanges]

	const steps = []
	while (changes.length) {
		const change = {...changes.pop()}
		const mark = {
			hue: 360, //mute
			start: change.start,
			size: change.insert.length
		}
		Move.cursorAfter(mark, steps)
		steps.unshift(change)
		marks.push(mark)
	}
	
	for (const mark of marks) cursors.push(mark)
	

	cursors.sort((a, b) => a.start - b.start)
	
	
	
	
	const splits = {}
	splits[0] = {pos:0, clsend:[], clsstart:[], start:{}, end: {}, blinks: []}
	for (const {cls, hue, start, size, direction} of cursors) {
		const end = start + size

		if (!splits[start]) splits[start] = {pos: start, clsend:[], clsstart:[], start:{}, end:{}, blinks:[]}
		if (!splits[end]) splits[end] = {pos: end, clsend:[], clsstart:[], start:{}, end:{}, blinks:[]}


		if (direction === 1) {
			splits[end].blinks.push(hue)
		} else if (direction === 0) {
			splits[start].blinks.push(hue)
		} else {
			//подсветка без курсора
		}

		if (!size) continue
		if (cls) {
			splits[start].clsstart.push(cls)
			splits[end].clsend.push(cls)
		} else if (hue) {
			splits[start].start[hue] = hue
			splits[end].end[hue] = hue
		}

		
	}
	// for (const mark of marks) {
	// 	const {cls, start, size, direction} = mark
	// 	const end = start + size

	// 	if (!splits[start]) splits[start] = {pos: start, clsend:[], clsstart:[], start:{}, end:{}, blinks:[]}
	// 	if (!splits[end]) splits[end] = {pos: end, clsend:[], clsstart:[], start:{}, end:{}, blinks:[]}


	// 	if (!size) continue
	// 	splits[start].clsstart.push(cls)
	// 	splits[end].clsend.push(cls)
	// }

	
	const lights = Object.values(splits)
	lights.sort((a, b) => a.pos - b.pos)
	lights.forEach(light => {
		light.start = Object.values(light.start)
		light.end = Object.values(light.end)
	})


	const going = []
	for (const pos of lights) {
		for (const hue of pos.start) {
			going.push(hue)
		}
		for (const hue of pos.end) {
			going.splice(going.indexOf(hue), 1)
		}
		pos.colors = going.slice()
		delete pos.end
		delete pos.start
	}

	lights.reverse()
	let prev = text.length
	for (const light of lights) {
		const size = prev - light.pos
		light.part = escapeText(text.substr(light.pos, size))
		prev = light.pos
	}
	lights.reverse()
	/*
		[
			{pos:10, part, blinks:[gray], colors:[blue]}
			{pos:20, part, colors:[blue green]}
			{pos:30, part, colors:[green]}
			{pos:40, part }
			{pos:50, part, blinks:[brown red]}
		]
	*/
	
	let html = ''
	for (const light of lights) {
		for (const cls of light.clsend) html += '</span>'
		for (const cls of light.clsstart) html += `<span class="${cls}">`

		for (const hue of light.blinks) {
			html += `<span style="--hue: ${hue}" class="cursor"></span>`
		}
		for (const hue of light.colors) {
			if (hue == 360) { //mute
				html += `<span class="select mute">`
			} else if (hue) {
				html += `<span style="--hue: ${hue}" class="select">`	
			} else {
				html += `<span class="select">`	
			}
			
		}
		//html += light.part.replaceAll('&','&amp;')
		
		

		html += light.part

		
		for (const color of light.colors) {
			html += '</span>'
		}
		
	}
	return html + '<br>'
	
	/*
		`
			
			asd 10
			<span class="cursor gray"></span>
			<span class="cursor blue"></span>
				fasd 20
			</span>
			<span class="select blue">
			<span class="select green">
				fasd 30
			</span>
			</span>
			<span class="select green">
				просто 40
			</span>
			курсор 50 
			<span class="cursor brown"></span> 
			<span class="cursor red"></span>
		`
		`</span>`
	*/



	//text.slice(0, start)


	//return escapeText(text)
}
