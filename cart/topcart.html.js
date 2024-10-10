import panel from "/-cart/panel.html.js"
import cost from "/-words/cost.js"
import common from "/-catalog/common.html.js"
const tpl = {}
export default tpl

tpl.USER = (data, env) => `
	<div class="header_table">
		<style>
			${env.scope} .header_table {
				display: grid;
				grid-template-columns: max-content 1fr;
				border: 1px solid var(--lightgrey);
				border-radius: 30px;
			}	
			${env.scope} .header_table_acc {
				padding: 10px 33px;
				justify-self: center;
				color: gray;
			}
			${env.scope} .header_table_cart {
				border-left: 1px solid var(--lightgrey);
				padding: 10px 20px;
				display: flex;
				align-items: center;
				justify-self: center;
				color: gray;
			}
			${env.scope} .header_table_cart_num {
				color: var(--lightgrey);
				border: 1px solid currentColor;
				border-radius: 50%;
				width: 20px;
				height: 20px;
				font-size: 12px;
				margin-left: 4px;
				font-weight: 600;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			@media (max-width: 850px) {
				${env.scope} .header_table_acc {
					padding: 10px 12px;
				}
				${env.scope} .header_table_cart {
					padding: 10px 12px
				}
			}
			@media (max-width: 550px) {		
				${env.scope} .header_table_acc {
					padding: 8px 10px;
				}
				${env.scope} .header_table_cart {
					padding: 8px 10px;
				}
			}
		</style>
		<a href="/user" data-animate="opacity" title="Личный кабинет">
			<div class="header_table_acc">
				<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M10.9994 10.9998C13.7767 10.9998 16.0281 8.74839 16.0281 5.9711C16.0281 3.19382 13.7767 0.942383 10.9994 0.942383C8.22214 0.942383 5.9707 3.19382 5.9707 5.9711C5.9707 8.74839 8.22214 10.9998 10.9994 10.9998Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M19.928 16.783C22.0842 18.223 20.7319 21.0575 18.1391 21.0575H3.86088C1.26811 21.0575 -0.0841643 18.223 2.07198 16.783C4.62681 15.0768 7.69724 14.082 11 14.082C14.3028 14.082 17.3732 15.0768 19.928 16.783Z" stroke="currentColor" stroke-width="1.5"/>
				</svg>
			</div>
		</a>				
		<div id="TOPCART"></div>
	</div>
`

const getWaitOrder = (orders) => {
	const waitorder = orders.find(o => o.status == 'wait')
	return waitorder
}
const getWaitOrderId = (orders) => {
	const waitorder = getWaitOrder(orders)
	if (!waitorder) return 0
	return waitorder.order_id
}
const getWaitOrderCount = (orders) => {
	const waitorder = getWaitOrder(orders)
	if (!waitorder) return 0
	return waitorder.count
}
tpl.CART = (data, env) => panel.isShowPanel(data) ? `
	<button	style="cursor:pointer; background: transparent;" class="header_table_cart transparent">
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M22.7141 1.28564H20.7764C19.8439 1.28564 19.035 1.9302 18.8269 2.83927L17.646 7.99685" 
				fill="transparent"
				stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			<path d="M1.74226 8.71443C1.91581 11.8359 2.86215 14.3939 3.54211 15.7232C3.73601 16.1023 4.04482 16.404 4.44848 16.5395C5.20144 16.7923 6.76472 17.1429 9.64293 17.1429C12.5211 17.1429 14.0844 16.7923 14.8374 16.5395C15.241 16.404 15.5498 16.1023 15.7437 15.7232C16.495 14.2544 17.5715 11.2858 17.5715 7.71436H2.71436C2.16207 7.71436 1.7116 8.16299 1.74226 8.71443Z" 
				fill="transparent"
				stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			<path d="M3.85714 22.2856C4.33053 22.2856 4.71429 21.9018 4.71429 21.4284C4.71429 20.955 4.33053 20.5713 3.85714 20.5713C3.38376 20.5713 3 20.955 3 21.4284C3 21.9018 3.38376 22.2856 3.85714 22.2856Z" fill="#4147D5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			<path d="M15 22.2856C15.4734 22.2856 15.8571 21.9018 15.8571 21.4284C15.8571 20.955 15.4734 20.5713 15 20.5713C14.5266 20.5713 14.1428 20.955 14.1428 21.4284C14.1428 21.9018 14.5266 22.2856 15 22.2856Z" fill="#4147D5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
		<span class="header_table_cart_num">${getWaitOrderCount(data.orders)}</span>
	</button>
	<script>
		(btn => {
			let t
			btn.addEventListener('click', async e => {
				e.preventDefault()
				e.stopPropagation()
				const animate = await import('/-controller/animate.js').then(r => r.default)
				animate('a', btn, 'opacity')
				
				const order_id = ${getWaitOrderId(data.orders)}

				if (order_id) {
					const ans = await fetch('/-cart/set-newactive?order_id=' + order_id).then(r => r.json()).catch(e => {
						console.log(e)
						return {msg:'Ошибка на сервере'}
					})
					const Client = await window.getClient()
					Client.global('cart')
				}

				const panel = document.querySelector('#PANEL .panel')
				const Panel = await import('/-cart/Panel.js').then(r => r.default)
				Panel.toggle(panel)
			})
		})(document.currentScript.previousElementSibling)
	</script>
` : ''