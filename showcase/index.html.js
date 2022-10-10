import controller from "/-controller/layout.html.js"
export const ROOT = (data, env) => `<!DOCTYPE html>
<html>
	<head>
		${controller.HEAD(data, env)}
		<link rel="icon" type="/image/svg+xml" href="/images/favicon.svg">
		<link rel="stylesheet" href="/style.css">
		<link rel="stylesheet" href="/-showcase/style.css">
	</head>
	<body style="margin:0;">
		<div style="padding:10px; min-height:100vh; display:flex; flex-direction:column">
			<header id="HEADER"></header>
			<main id="CONTENT" style="flex-grow: 1" ></main>
			<div id="PANEL" style="position: sticky; bottom:0; background-color:white; 
				padding-bottom:1rem; padding-top:1rem; 
				border-top:1px gray solid;
				">
			</div>
			<footer id="FOOTER"></footer>
		</div>
	</body>
</html>
`

export const PANEL = (data, env, { layer:{div} } = env) => `
	<div style="display: flex; gap:0.5rem; flex-wrap:wrap;"> 
		<button name="set-tables-loadall" class="${data.ready?.tables ? 'ready' : ''}">Внести новые данные</button>
		<button name="set-prices-loadall" class="${data.ready?.prices ? 'ready' : ''}">Внести новые прайсы</button>
		<button name="set-files-loadall" class="${data.ready?.files ? 'ready' : ''}">Связать всё с файлами</button>
		<!-- при загрузке файлов на сервер, нет никаких событий. Мы никогда не знает есть новые файлы или нет -->
	</div>
	<script type="module" async>
		import { action } from "/-showcase/action.js"
		const div = document.getElementById('${div}')
		const tag = tag => div.getElementsByTagName(tag)
		for (const btn of tag('button')) action(btn)
	</script>
`

export const HEADER = (data, env) => `
	<div style="display: flex; justify-content: space-between; flex-wrap:wrap">
		<div>
			<a href="${env.crumb}">SHOWCASE</a> 
			<span id="STAT"></span>
		</div>
		<a href="/">${env.host}</a>
	</div>
	<div style="display: flex; justify-content: space-between; flex-wrap:wrap">
		<p>
			<a href="tables">Данные</a>
			<a href="prices">Прайсы</a>
			<a href="brands">Бренды</a>
			<a href="groups">Группы</a>
			<a href="props">Свойства</a>
			<a href="values">Значения</a>
			<a href="models">Модели</a>
			<a href="files">Файлы</a>
		</p>
		<p>
			<button name="set-applyall">Применить всё</button>
		</p>
	</div>
	<script type="module" async>
		import { action } from "/-showcase/action.js"
		const div = document.getElementById('${env.layer.div}')
		const tag = tag => div.getElementsByTagName(tag)
		for (const btn of tag('button')) action(btn)
	</script>
`

export const MAIN = (data) => `
<p>
	Администратор сайта: ${data.admin?'Да':'Нет<br><a href="/@atee/controller">Вход</a>'}
	<br>
	База данных: ${data.isdb?'Да':'Нет'}
</p>
`

export const FOOTER = (data, env) => `
	<div style="
		margin-top: 1rem;
		padding-top: 1rem;
		border-top:1px #eee solid; display: flex; flex-wrap: wrap; gap:0.5rem">

		<div style="flex-grow:1;">
			<a href="/@atee/controller">Вход</a> <a href="settings">Настройки</a>
		</div>
		<div style="display: flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.5rem; align-items:center"> 
			<button name="set-tables-clearall">Очистить данные</button>
			<button name="set-prices-clearall">Очистить прайсы</button>
		</div>
	</div>
	<script type="module" async>
		import { action } from "/-showcase/action.js"
		const div = document.getElementById('${env.layer.div}')
		const tag = tag => div.getElementsByTagName(tag)
		for (const btn of tag('button')) action(btn)
	</script>

`