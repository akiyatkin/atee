import date from "/-words/date.html.js"
import field from "/-dialog/field.html.js"
export const css = ["/-float-label/style.css"]
export const ROOT = (data, env) => `
	<div style="float:left; margin-top: 1rem; display: block;">
		<a href="/user">Личный кабинет</a>
	</div>
	<h1>Мои почтовые адреса</h1>
	${data.result ? showEmails(data, env) : '<p>' + data.msg + '<p>'}
	
`
const showEmails = (data, env) => `
	<ul>
		<li>Чтобы изменить свой текущий email нужно добавить новый и удалить старый.</li>
		<li>Сообщения с сайта отправляются на первый email в списке.</li>
		<li>Ссылка для входа отправляется на все email.</li>
		<li>Если один email уже в чьём-то списке, то сначало надо удалить его из списка другого пользователя.</li>
		<li>Авторизоваться в аккаунте можно по любому email.</li>
	</ul>
	<style>
		${env.scope} table tbody tr:first-child td:first-child {
			font-weight: bold;
		}
		${env.scope} table tbody tr:first-child .del {
			opacity:0.5;
			
			pointer-events: none;
		}
		${env.scope} .item {
			
			transition: background-color 0.1s
		}
		${env.scope} .item.selected {
			opacity:0.5;
			background-color: lightblue;
		}
	</style>
	<table draggable="false">
		<thead>
			<tr>
				<td>Email</td>
				<td>Добавлен</td>
				<td>Подтверждён</td>
				<td></td>
			</tr>
		</thead>
		<tbody>
			${data.list.map(row => showTR(data, env, row)).join('')}
		</tbody>
	</table>
	<script>
		(async div => {
			const table = div.querySelector('table')
			const Drag = await import('/-drag/Drag.js').then(r => r.default)
			Drag.make(table.tBodies[0], '/-user/set-email-ordain')
		})(document.currentScript.parentElement)
	</script>
	<p>
		${field.prompt({
			label: 'Укажите Email',
			input: '',
			value: 'Добавить Email',
			action: '/-user/set-email-add',
			reloaddiv: env.layer.div
		})}
	</p>
`
const showTR = (data, env, row) => `
	<tr data-id="${row.email}" class="item" data-ordain="${row.ordain}">
		<td>
			${row.email}
		</td>
		<td>
			${date.dmy(row.date_add)}
		</td>
		<td>
			${row.date_verified ? '✔' : (row.date_verify ? date.dmy(row.date_verify) + ' отправлено письмо' : showVerify(data, env, row))}
		</td>
		<td>${field.button({
			cls:'del',
			args: {email:row.email}, 
			reloaddiv: env.layer.div, 
			confirm: 'Удалить email из списка?',
			action:'/-user/set-email-delete',
			label:'✖'	
		})}</td>
	</tr>
`
const showVerify = (data, env, row) => `
	${field.button({
		action:'/-user/set-email-verify',
		args:{email:row.email, go:'/user/emails'},
		confirm: 'Нужно будет перейти по ссылке в письме. Отправить письмо?',
		label: 'Подтвердить',
		reloaddiv: env.layer.div
	})}
`