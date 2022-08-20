const run = (obj, call) => {
	const res = []
	for (const key in obj) res.push(call(obj[key], key))
	return res
}
export const ROOT = (data, env) => `
	<h1>Файлы</h1>
	<p>Не используются. Возможно их лучше удалить или переименовать.</p>
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
