import field from "/-dialog/field.html.js"
import date from "/-words/date.html.js"
import ago from "/-words/ago.html.js"
import err from "/-controller/err.html.js"
export const css = ['/-sources/represent.css','/-sources/revscroll.css']
export const ROOT = (data, env) => `
	<h1>Магазин</h1>
	<style>
		${env.scope} .red {
			color: red;
		}
		${env.scope} table thead td {
			font-weight: normal;
		}
		${env.scope} .green {
			color: green;
		}
	</style>
	
	${showAuth(data, env)}
`

const showAuth = (data, env) => `
	<div style="display: grid; gap: 0.25em; margin: 1em 0">
		<div>Администратор сайта: ${data.admin?'Да':'Нет'}</div>
		<div>База данных: ${data.isdb?'Да':'Нет'}</div>
	</div>
`
