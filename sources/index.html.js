import controller from "/-controller/layout.html.js"
export const ROOT = (data, env) => `<!DOCTYPE html>
<html>
	<head>
		${controller.HEAD(data, env)}
		<link rel="icon" type="image/x-icon" href="/favicon.ico">
		<link rel="stylesheet" href="/-notreset/style.css">
		<link rel="stylesheet" href="/-notreset/table.css">
		<link rel="stylesheet" href="/style.css">
		<link rel="stylesheet" href="/-sources/style.css">
		<base href="/@atee/sources/">
	</head>
	<body style="margin:0;">
		<div style="min-height:100vh; display:grid; grid-template-rows: 1fr max-content; padding:1rem 0">
			<div class="container" style="width:100%;">
				<header id="HEADER"></header>
				<div style="display: grid; gap: 1rem; grid-template-columns: auto 1fr;">
					<aside id="ASIDE"></aside>
					<main id="MAIN" style="flex-grow: 1"></main>
				</div>
			</div>
			<footer id="FOOTER"></footer>
		</div>
	</body>
</html>
`

export const ASIDE = (data, env) => `
	фыва
`
export const HEADER = (data, env) => `
	<div style="display: flex; justify-content: space-between; flex-wrap:wrap; align-items: center; gap: 1rem">
		<div>
			<a href="${env.crumb}">SOURCES</a> 
		</div>
		<div style="display: flex; justify-content: space-between; flex-wrap:wrap; align-items: center; gap: 1rem">
			<a href="/../../">${env.host}</a>
			<button title="Загрузить если были изменения">Применить всё</button>
		</div>
	</div>
	<div style="display: flex; justify-content: space-between; flex-wrap:wrap">
		<p>
			<!-- <a href="tables">Таблицы</a>
			<a href="prices">Прайсы</a>
			<a href="brands">Бренды</a>
			<a href="groups">Группы</a>
			<a href="props">Свойства</a>
			<a href="values">Значения</a>
			<a href="models">Модели</a>
			<a href="files">Файлы</a>
			<a href="statistics">Статистика</a> -->
		</p>
		<p>
			
		</p>
	</div>	
`

export const MAIN = (data) => `
<p>
	Администратор сайта: ${data.admin?'Да':'Нет <a href="/@atee/controller">Вход</a>'}
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
			<p>
				<a href="/-controller/set-access">Сбросить серверный кэш</a><br>
				<a href="/-controller/set-update">Перезапустить сервер</a>
			</p>
		</div>
	</div>
`