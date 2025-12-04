
const parse = (text) => {
	//const reg = /\{([^\s][^\}]*?)\s{0,1}([^\}]*[^\s])\}/g;
	const reg = /\{([^\}\n]*)\}/g;
	const matches = [...text.matchAll(reg)]
	const marks = []
	for (const m of matches) {
		if (m[1].at(0) == ' ') continue
		if (m[1].at(-1) == ' ') continue
		const start = m.index
		const size = m[0].length
	
		marks.push({	
			cls: 'brackets',
			start,
			size
		})
	}
	return marks
}

export default parse