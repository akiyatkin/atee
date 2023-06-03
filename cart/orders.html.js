const TITLES = {
	"wait":"Оформить заказ",
	"check":"Заказ оформлен",
	"complete":"Заказ выполнен",
	"cancel":"Заказ отменён",
	"empty":"В заказе нет товаров",
	"pay":"Заказ ожидает оплату"
}

export const ROOT = (data, env) => `
	<div class="container">
		<style>
			${env.scope} .orderStyle {
				display: flex;
				background-color: white;
				padding: 20px;
				margin-bottom: 1rem;
			}
			${env.scope} .border {
				border: 3px solid var(--border-color);
				border-radius: var(--radius);
			}
			${env.scope} .orderDetaly {				
				padding-right: 10px;
				padding-top: 5px;
				padding-bottom: 5px;
			}
			@media screen and (max-width:940px){
				${env.scope} .orderStyle {
					flex-direction: column;
					max-width: 400px;
				}
			}
		</style>
		<h1>Мои заказы</h1>
		<p style="margin-bottom: 1rem">
			Пользователь: ${data.user?.email ?? 'Email ещё не указан'}
		</p>
		<div class="row">
			${data.orders?.map(val => showOrder(data, env, val)).join('')?? ''}
		</div>
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
	</div>
`


const showOrder = (data, env, order) => `
	<div class='orderStyle border'>
		${order.datecheck ? showDate(order) : ''}
		<div class="orderDetaly">Заказ № <b>${order.order_nick}</b></div> 
		<div class="orderDetaly">Сумма: <b>${order.sum} руб.</b></div> 
		<div class="orderDetaly">Статус: <b>${TITLES[order.status]}</b></div>
		<div class="orderDetaly">
			<button title="Оформить заказ" data-order_id="${order.order_id}" class="a">Подробнее о заказе</button>
		</div>
		
	</div>

`
const showDate = (order) => `
	<div class="orderDetaly">
		<b>
			${new Date(order.datecheck * 1000).toLocaleDateString('ru-RU')}
		</b>
	</div>
`

