import { HEAD } from "/-controller/layout.html.js"
export const ROOT = (...args) => `<!DOCTYPE html>
<html>
	<head>
		${HEAD(...args)}
		<base href="/@atee/showcase/">
		<link rel="icon" type="/image/svg+xml" href="/images/favicon.svg">
		<link rel="stylesheet" href="/style.css">
		<link rel="stylesheet" href="/-showcase/style.css">
	</head>
	<body style="margin:0;">
		<div style="padding:10px; min-height:100vh; display:flex; flex-direction:column">
			<header id="HEADER">${HEADER(...args)}</header>
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

export const PANEL = (data, env) => `
	<div style="display: flex; gap:0.5rem; flex-wrap:wrap;"> 
		<button name="tables" data-action="set-tables-loadall" class="${data.ready.tables ? 'ready' : ''}">Внести данные</button>
		<button name="prices" data-action="set-prices-loadall" class="${data.ready.prices ? 'ready' : ''}">Внести прайсы</button>
		<button name="files" data-action="set-files-loadall" class="${data.ready.files ? 'ready' : ''}">Связать всё с файлами</button>
		<!-- при загрузке файлов на сервер, нет никаких событий. Мы никогда не знает есть новые файлы или нет -->
	</div>
	<script type="module" async>
		const id = id => document.getElementById(id)
		const div = id('${env.div}')
		const tag = (tag, el = div) => el.getElementsByTagName(tag)
		for (let btn of tag('button')) {
			btn.addEventListener('click',async () => {
				btn.innerHTML = 'В процессе...'
				btn.disabled = true
				const ans = await fetch('/-showcase/'+btn.dataset.action).then(res => res.json()).catch(e => false)
				btn = tag('button').namedItem(btn.name)
				if (!btn) return
				btn.innerHTML = ans?.msg || 'Ошибка'
				btn.classList.add('ready')
				
				btn = tag('button').namedItem(btn.name)
				if (!btn) return
				btn.disabled = false
				
				const Client = await window.getClient()
				Client.reloaddiv('CONTENT')
			})
		}
	</script>
`

export const HEADER = (data, {root, host}) => `
	<div style="display: flex; justify-content: space-between; flex-wrap:wrap">
		<a href="/${root}">SHOWCASE</a>
		<a href="/">${host}</a>
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
			<button>Применить всё</button>
		</p>
	</div>
`

export const MAIN = (data) => `
<p>
	Администратор сайта: ${data.admin?'Да':'Нет<br><a href="/@atee/controller">Вход</a>'}
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
		const id = id => document.getElementById(id)
		const div = id('${env.div}')
		const tag = (tag, el = div) => el.getElementsByTagName(tag)
		for (let btn of tag('button')) {
			btn.addEventListener('click',async () => {
				btn.innerHTML = 'В процессе...'
				btn.disabled = true
				const ans = await fetch('/-showcase/'+btn.name).then(res => res.json()).catch(e => false)
				btn = tag('button').namedItem(btn.name)
				if (!btn) return
				btn.innerHTML = ans?.msg || 'Ошибка'
				btn.classList.add('ready')
				btn.disabled = false
				const Client = await window.getClient()
				Client.reloaddiv('CONTENT')
				Client.reloaddiv('PANEL')
			})
		}
	</script>

`