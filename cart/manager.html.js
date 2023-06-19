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
	${showStatuses(data, env)}
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
			<a href="/cart/manager/${row.year}${prefixif('?status=', data.status)}">${row.year}</a>
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
	<h1><a href="/cart/manager${prefixif('?status=', data.status)}">Заказы</a> ${data.year}</h1>
	${showStatuses(data, env)}
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
tpl.STATUSES = {
	'check':'Оформлен',
	'pay':'Оплата',
	'paid':'Оплачен',
	'complete':'Выполнен',
	'cancel':'Отменён',
	'wait':'Ожидает'
}
tpl.showMonth = (data, env, row) => `
	<tr>
		<td>
			<a href="/cart/manager/${row.year}/${row.month}${prefixif('?status=', data.status)}">${MONTHS[row.month - 1]}</a>
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
const prefixif = (prefix, val) => val ? prefix + '' + val : ''
const showStatuses = (data, env) => `
	<p>
		<a style="${data.status ? '': 'font-weight:bold'}" href="/cart/manager${prefixif('/', data.year)}${prefixif('/', data.month)}">Все</a>
		<a style="${data.status == 'wait' ? 'font-weight:bold' : ''}" href="/cart/manager${prefixif('/', data.year)}${prefixif('/', data.month)}?status=wait">Ожидает</a>
		<a style="${data.status == 'check' ? 'font-weight:bold' : ''}" href="/cart/manager${prefixif('/', data.year)}${prefixif('/', data.month)}?status=check">Оформлен</a>
		<a style="${data.status == 'complete' ? 'font-weight:bold' : ''}" href="/cart/manager${prefixif('/', data.year)}${prefixif('/', data.month)}?status=complete">Выполнен</a>
		<a style="${data.status == 'cancel' ? 'font-weight:bold' : ''}" href="/cart/manager${prefixif('/', data.year)}${prefixif('/', data.month)}?status=cancel">Отменён</a>
	</p>
`
tpl.ORDERS = (data, env) => tpl.iserr(data, env) || `
	<h1><a href="/cart/manager${prefixif('?status=', data.status)}">Заказы</a> <a href="/cart/manager/${data.year}${prefixif('?status=', data.status)}">${data.year}</a> ${MONTHS[data.month - 1]}</h1>
	${showStatuses(data, env)}
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
				<td>Заказ</td><td>ФИО</td><td>Email</td><td>Телефон</td><td>Позиций</td><td>Сумма</td><td>Статус</td><td>Изменения</td><td></td>
			</tr>
		</thead>
		<tbody>
			${data.list.map(row => tpl.showOrder(data, env, row)).join('')}
		</tbody>
	</table>

	<script>
		(div => {
			for (const button of div.getElementsByClassName('status')) {
				const list = ['wait','check','complete','cancel']
				button.addEventListener('click', async () => {
					const status = list[list.indexOf(button.dataset.status) + 1] || list[0]
					const order_id = button.dataset.order_id
					const ans = await fetch('/-cart/set-status?' + new URLSearchParams({ status, order_id }).toString()).then(r => r.json()).catch(e => {
						console.log(e)
						return {msg:'Ошибка на сервере'}
					})
					const tpl = await import('${env.layer.tpl}').then(r => r.default || r)
					
					const classList = button.closest('tr').classList
					classList.remove('status-' + button.dataset.status)
					classList.add('status-' + status)

					button.dataset.status = status
					button.innerHTML = tpl.STATUSES[status]

					if (ans.active_id == order_id) {
						const Client = await window.getClient()
						Client.global('cart')
						//Client.reloadts('${env.layer.ts}')
					}
				})
			}
			for (const button of div.getElementsByClassName('order')) {
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
			for (const button of div.getElementsByClassName('delete')) {
				button.addEventListener('click', async () => {
					const order_id = button.dataset.order_id
					const order_nick = button.dataset.order_nick
					if (!confirm('Удалить заказ ' + order_nick + ' ?')) return
					
					const ans = await fetch('/-cart/set-delete?' + new URLSearchParams({ order_id }).toString()).then(r => r.json()).catch(e => {
						console.log(e)
						return {msg:'Ошибка на сервере'}
					})
					const Client = await window.getClient()
					Client.reloadts('${env.layer.ts}')
					if (ans.active_id == order_id) {
						Client.global('cart')
					}
				})
			}
		})(document.currentScript.previousElementSibling)
	</script>
	${tpl.buttons(data, env)}
`
tpl.showOrder = (data, env, row) => `
	<tr class="status-${row.status} ${row.order_id == data.active_id ? 'active': ''}">
		<td>
			<button class="order a" style="white-space:nowrap; font-size: inherit;" data-order_id="${row.order_id}">${row.order_nick}</button>
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
			<button title="Изменить статус" data-status="${row.status}" data-order_id="${row.order_id}" class="a status">${tpl.STATUSES[row.status]}</button>
		</td>
		<td style="white-space: nowrap;">
			${new Date(row.dateedit * 1000).toLocaleString('ru-RU', { minute: 'numeric', hour: 'numeric', year: 'numeric', month: 'numeric', day: 'numeric' })}
		</td>
		<td>
			<button title="Удалить" data-order_id="${row.order_id}" data-order_nick="${row.order_nick}" class="a delete">X</button>
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