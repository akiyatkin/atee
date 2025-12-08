import nicked from "/@atee/nicked"

const parse = (text) => {	
	const reg = /(^|\n)\t*(\*\*[^\n]+\*\*)/g;
	const matches = [...text.matchAll(reg)]
	const marks = []
	for (const m of matches) {
		const start = m.index
		const size = m[0].length
		marks.push({
			cls: 'note_bold',
			start,
			size
		})
	}
	return marks
}


export default parse