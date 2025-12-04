const parse = (text) => {	
	const reg = /https?:\/\/[^\s\]"'<>(){}|\\^`[\]]+/gi;
	const matches = [...text.matchAll(reg)]
	const marks = []
	for (const m of matches) {

		const length = m[0].length

		const start = m.index
		const size = m[0].length
	
		marks.push({
			cls: 'note_link',
			start,
			size
		})
	}
	return marks
}


export default parse