import print from "/-words/print.html.js"
const tpl = {}


tpl.ROOT = (data, env) => `
	<h1>фыва</h1>
	${print.json(data.list[0])}

	

`


export default tpl