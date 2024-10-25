import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"

export const ROOT = (data, env) => err(data, env) || `
	<h1>Настройки</h1>
	<p>
		Папка с источниками <b>${data.dir}</b>
	</p>
	<div style="display: grid; gap: 0.25em">
		<a href="/@atee/controller">Авторизация</a>
		<a href="/-controller/set-access">Сбросить серверный кэш</a>
		<a href="/-controller/set-update">Перезапустить сервер</a>
	</div>
	
`