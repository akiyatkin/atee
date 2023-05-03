import words from "/-words/words.js"
import common from "/-catalog/common.html.js"
import cost from "/-words/cost.js"

const tpl = {}
export default tpl
tpl.iserr = (data, env) => data?.result ? '' : `
	<h1>Ошибка</h1>
	${data?.msg || 'Нет данных'}
`

tpl.YEARS = (data, env) => tpl.iserr(data, env) || `
	<h1>Заказы</h1>
	<table>
		<thead>
			<tr>
				<td>Год</td><td>Заказов</td><td>Средний чек</td><td>Всего</td>
			</tr>
		</thead>
		${data.list.map(row => tpl.showYear(data, env, row)).join('')}
	</table>
	${tpl.buttons(data, env)}
`
tpl.showYear = (data, env, row) => `
	<tr>
		<td>
			<a href="/cart/manager/${row.year}">${row.year}</a>
		</td>
		<td>
			${row.count}
		</td>
		<td>
			${cost(row.average)}
		</td>
		<td>
			${cost(row.sum)}
		</td>
	</tr>
`

tpl.MONTHS = (data, env) => tpl.iserr(data, env) || `
	<h1><a href="/cart/manager">Заказы</a> ${data.year}</h1>
	<table>
		<thead>
			<tr>
				<td>Месяц</td><td>Заказов</td><td>Средний чек</td><td>Всего</td>
			</tr>
		</thead>
		${data.list.map(row => tpl.showMonth(data, env, row)).join('')}
	</table>
	${tpl.buttons(data, env)}
`
const MONTHS = ['Январь','Февраль','Март', "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь" ]
const STATUSES = {
	'check':'Отправлен',
	'pay':'Оплата',
	'paid':'Оплачен',
	'complete':'Выполнен',
	'wait':'Ожидает'
}
tpl.showMonth = (data, env, row) => `
	<tr>
		<td>
			<a href="/cart/manager/${row.year}/${row.month}">${MONTHS[row.month - 1]}</a>
		</td>
		<td>
			${row.count}
		</td>
		<td>
			${cost(row.average)}
		</td>
		<td>
			${cost(row.sum)}
		</td>
	</tr>
`


tpl.ORDERS = (data, env) => tpl.iserr(data, env) || `
	<h1><a href="/cart/manager">Заказы</a> <a href="/cart/manager/${data.year}">${data.year}</a> ${MONTHS[data.month - 1]}</h1>
	<style>
		${env.scope} .status-check {
			background-color: #fff7ed;
		}
		${env.scope} .status-wait {
			opacity:0.4;
		}
		${env.scope} .active {
			font-weight: bold;
		}
	</style>
	<table>
		<thead>
			<tr>
				<td>Заказ</td><td>ФИО</td><td>Email</td><td>Телефон</td><td>Позиций</td><td>Сумма</td><td>Изменения</td>
			</tr>
		</thead>
		${data.list.map(row => tpl.showOrder(data, env, row)).join('')}
	</table>
	<script>
		(div => {
			for (const button of div.getElementsByTagName('button')) {
				button.addEventListener('click', async () => {
					const ans = await fetch('/-cart/set-newactive?' + new URLSearchParams({ order_id: button.dataset.order_id }).toString()).then(r => r.json()).catch(e => {
						console.log(e)
						return {msg:'Ошибка на сервере'}
					})
					const Client = await window.getClient()
					Client.global('cart')
					Client.reloadts('${env.layer.ts}')

					const Panel = await import('/-cart/Panel.js').then(r => r.default)
					const panel = document.querySelector('#PANEL .panel')
					Panel.up(panel)
				})
			}
		})(document.currentScript.previousElementSibling)
	</script>
	${tpl.buttons(data, env)}
`
tpl.showOrder = (data, env, row) => `
	<tr class="status-${row.status} ${row.order_id == data.active_id ? 'active': ''}">
		<td>
			<button style="font-size: inherit;" data-order_id="${row.order_id}" class="a">${row.order_nick}</button>
		</td>
		<td>
			${row.name}
		</td>
		<td>
			${row.email}
		</td>
		<td>
			${row.phone}
		</td>
		<td>
			${row.count}
		</td>
		<td>
			${cost(row.sum)}
		</td>
		<td>
			${new Date(row.dateedit * 1000).toLocaleString(undefined, { minute: 'numeric', hour: 'numeric', year: 'numeric', month: 'numeric', day: 'numeric' })}
		</td>
	</tr>
`
tpl.buttons = (data, env) => `
	<p align="right">
		<button>Пересчитать</button>
		<script>
			(button => {
				button.addEventListener('click', async () => {
					const ans = await fetch('/-cart/set-manager-refresh?partner').then(r => r.json()).catch(e => {
						console.log(e)
						return {msg:'Ошибка на сервере'}
					})
					const Dialog = await import('/-dialog/Dialog.js').then(r => r.default)
					Dialog.alert(ans.msg)
					const Client = await window.getClient()
					Client.reloadts('${env.layer.ts}')
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</p>
`