import common from "/-catalog/common.html.js"
import number from "/-cart/number-block.html.js"
export const css = [...number.css]
export const ROOT = (data, env) => `
	<h1>Заказ</h1>
`
export const CART = (data, env) => `
	<div class="cart">
		<style>
			${env.scope} {
				z-index:200;
				position: sticky; bottom:0; 
				background:white; 
				border-top: 1px solid gray;
			}
			
			${env.scope} .cart .body {
				max-height: 110px;
				transition: max-height 0.3s;
				overflow: hidden;
			}

			${env.scope} .cart.show .body {
				max-height: calc(100vh - 100px);
			}
			${env.scope} .cart.ready .body {
				overflow-y: auto;
			}
			${env.scope} .hand {
				margin:0 auto;
				height: 40px;
				position: relative;
			    margin-bottom: -15px;
			    margin-top: -25px;
				padding:7px 14px;

				cursor: pointer;
				width:max-content; 
				
				border-radius: 50px; 
				background: white; 
				border:solid 1px gray; 
				align-items: center;
				display: none;
				grid-template-columns: 1fr max-content;
				gap:1rem;
			}

			${env.scope} .cart.up .hand {
				display: grid;
				
			}
			${env.scope} .cart.up .hand svg {
				transform-origin: center;
				transition: transform 0.3s;
			}
			${env.scope} .cart.show .hand svg {
				transform: rotate(180deg);
			}
			${env.scope} .cart.up {
				position: relative;
			}
			${env.scope} .cart .list {
				padding: 25px 0 20px 0;
				display: grid;
				grid-template-columns: max-content max-content max-content;
				gap: 10px;
			}
			
		</style>
		<div class="hand">
			<svg fill="#000000" height="20" width="20" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
				 viewBox="0 0 511.801 511.801" xml:space="preserve">	
				<path d="M263.535,248.453c-4.16-4.16-10.88-4.16-15.04,0L3.054,493.787c-4.053,4.267-3.947,10.987,0.213,15.04
					c4.16,3.947,10.667,3.947,14.827,0l237.867-237.76l237.76,237.76c4.267,4.053,10.987,3.947,15.04-0.213
					c3.947-4.16,3.947-10.667,0-14.827L263.535,248.453z"/>
				<path d="M18.201,263.493l237.76-237.76l237.76,237.76c4.267,4.053,10.987,3.947,15.04-0.213c3.947-4.16,3.947-10.667,0-14.827
					L263.535,3.12c-4.16-4.16-10.88-4.16-15.04,0L3.054,248.453c-4.053,4.267-3.947,10.987,0.213,15.04
					C7.534,267.547,14.041,267.547,18.201,263.493z"/>
			</svg>
			<span>5 позиций на 1309 руб.</span>
		</div>
		<script>
			(hand => {
				const cart = hand.closest('.cart')
				let t
				hand.addEventListener('click', () => {
					cart.classList.toggle('show')
					cart.classList.remove('ready')
					clearTimeout(t)
					t = setTimeout(() => {
						if (!cart.classList.contains('show')) return
						cart.classList.add('ready')
					}, 500)
				})
			})(document.currentScript.previousElementSibling)
		</script>
		<div class="body" id="CARTBODY"></div>
	</div>
`
export const BODY = (data, env) => data.result ? `
	<script>
		(body => {
			const cart = body.closest('.cart')
			const length = ${data.list.length}
			if (length == 1) {
				cart.classList.remove('up')
			} else {
				cart.classList.add('up')
			}
		})(document.currentScript.parentElement)
	</script>
	<div class="list">
		${data.list.map(mod => showPos(mod, env)).join('')}
	</div>
` : `
	В заказе ничего нет
	<script>
		(body => {
			const cart = body.closest('.cart')
			cart.classList.remove('up')
		})(document.currentScript.parentElement)
	</script>
`
const showPos = (mod, env) => `
	
	<div>${mod.images?.[0] ? showImage(mod) : ''}</div>
	<div>
		<div>${mod.Серия}</div>
		<div>${mod.Код} на ${mod.Рамок} рамок</div>
		<div><b>${mod.Цена}${common.unit()}</b></div>
	</div>
	<div>
		${number.INPUT({min:0, max:1000, value:mod.count, name:mod.model_nick})}
	</div>
`
const showImage = mod => `
	<img alt="" width="80" height="80" src="/-imager/webp?fit=contain&h=100&w=100&src=${mod.images[0]}">
`