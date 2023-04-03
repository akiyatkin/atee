export const CART = (data, env) => `
	<div class="cart last">
		<style>
			${env.scope} .hand {
				width:max-content; 
				padding:7px; 
				margin:0 auto;
				margin-bottom: -20px;
				margin-top:-16px; 
				border-radius: 50%; 
				background: white; 
				border:solid 1px gray; 
				display: grid; align-items: center
			}
			${env.scope} .cart.empty .hand {
				display: none;
			}
			${env.scope} .cart.last {
				position: relative;
				cursor: pointer;
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
		</div>
		<div id="CARTBODY"></div>
	</div>
`
export const BODY = (data, env) => data.result ? `
	<script>
		(body => {
			const div = body.closest('.cart')
			div.classList.add('last')
			div.classList.remove('empty')
		})(document.currentScript.parentElement)
	</script>
	${data.list.map(mod => showPos(mod, env)).join()}
` : `
	В заказе ничего нет
	<script>
		(body => {
			const div = body.closest('.cart')
			div.classList.remove('last')
			div.classList.add('empty')
		})(document.currentScript.parentElement)
		//import cart from "/-cart/cart.js"
		//cart.empty()
	</script>
`
const showPos = (mod, env) => `
	<div>${mod.model_title}</div>
`