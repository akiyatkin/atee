import { words } from "/-words/words.js"
const run = (obj, call) => {
	const res = []
	for (const key in obj) res.push(call(obj[key], key))
	return res
}
export const ROOT = (data, env) => `
	<h1>Файлы</h1>
	<p>Свободно: <b>${data.count}</b> ${words(data.count, 'файл', 'файла', 'файлов')}.</p>
	${run(data.parts, printpart).join('')}
`
const printpart = (root, name) => `
	<b>${name}</b>
	${root.dirs.map(showdir).join('')}
	<div style="margin-left:1rem">
		${root.files.map(showfile).join(', ')}
	</div>
`
const showfile = (info) => `${info.file}`
const showdir = (root) => `
<div style="margin-left:1rem;">
	<b>${root.name}</b>
	${root.dirs.map(showdir).join('')}
	<div style="margin-left:1rem">
		${root.files.map(showfile).join(', ')}
	</div>
</div>
`
