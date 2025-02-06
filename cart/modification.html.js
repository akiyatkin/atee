import err from "/-controller/err.html.js"
export const ROOT = (data, env) => err(data, env) || `
	<h1>Модификация</h1>
	<form>
		<div>
			<input type="text" name="modification" value="${data.item.modification}">
		</div>
		<button type="submit">Сохранить</button>
	</form>
`