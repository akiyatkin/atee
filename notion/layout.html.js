export const ROOT = (data) => `
<p>
	Администратор сайта: ${data.admin?'Да':'Нет'}<br>
	Файл .notion.json: ${data.notion?'ОК':'Error'}
</p>
<a href="list">Список статей</a>
`
export const LIST = (data, {div, root, host}) => `
	<h1>Список файлов</h1>
	${data.pages.map(fileitem).join('')}
	<script type="module" async>
		import { Client } from "/-controller/Client.js"
		const div = document.getElementById('${div}')
		div.addEventListener('click', async e => {
			const button = e.target.closest('.load')
			if (!button) return
			const id = button.dataset.id
			const res = await fetch('/-notion/set-load?id=' + id).then(res => res.json())
			console.log(res)
			Client.refreshState()
		})
		div.addEventListener('click', async e => {
			const button = e.target.closest('.del')
			if (!button) return
			const id = button.dataset.id
			const res = await fetch('/-notion/set-del?id=' + id).then(res => res.json())
			console.log(res)
			Client.refreshState()
		})
	</script>
`
const fileitem = ({ Name, id, props, Edited, Loaded }) => `
	<div style="margin-bottom: 1rem">
		<a href="page/${id}">${Name}</a>
		<div style="font-size: 13px; line-height: normal">
			<div style="color: ${(!Loaded || !Edited || Edited > Loaded) ? 'red' : 'inherit'}">
				<span title="Edited">${date(Edited)}</span> -> <span title="Loaded">${date(Loaded)}</span>
			</div>
			${Object.entries(props).map(prop).join('')} 
		</div>
		<p>
			<button data-id="${id}" class="load" ${Edited?'':'disabled'}>Загрузить</button> 
			<button data-id="${id}" class="del" ${Loaded?'':'disabled'}>Удалить</button>
		</p>
	</div>
`
const date = (time) => time ? new Date(time).toLocaleDateString('ru-RU', {dateStyle:'short'}) : ''
const prop = ([key, {type, val}]) => `<div>${key}: ${val}</div>`
export const PAGE = (page) => `
	${page.cover?cover(page.cover):''}
	<div style="max-width: 700px">
		<small style="float:right" title="Последние изменения">${date(page.Edited)}</small>
		<h1>${page.Name}</h1>
		${page.html}
	</div>
`
const cover = (cover) => `
	<div style="margin-top: 1rem; 
		background-image:url('${cover}&fm=webp&q=75&auto=compress&w=1360&h=200&fit=crop'); 
		background-size: cover; height:200px; background-position: center;"></div>
`