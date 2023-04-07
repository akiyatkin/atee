import common from "/-catalog/common.html.js"
import number from "/-cart/number-block.html.js"
import words from "/-words/words.js"
import cost from "/-words/cost.js"
export const css = [...number.css]

export const ROOT = (data, env) => `
	<div class="panel">
		<style>
			${env.scope} {
				z-index:200;
				position: sticky; bottom:0; 
				background:white; 
				border-top: 1px solid gray;
			}
			${env.scope} .panel {
				pointer-events: none;
			}
			${env.scope} .panel.up {
				position: relative;
			}
			${env.scope} .panel .hand {
				pointer-events: visiblePainted;
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
			${env.scope} .panel.up .hand {
				display: grid;
				
			}
			${env.scope} .panel.up .hand svg {
				transform-origin: center;
				transition: transform 0.3s;
			}
			${env.scope} .panel.show .hand svg {
				transform: rotate(180deg);
			}
			
			${env.scope} .panel .body {
				max-height: 110px;
				transition: max-height 0.3s;
				overflow: hidden;
				pointer-events: visiblePainted;

				/*display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 1fr;*/
			}
			${env.scope} .panel.show .body {
				max-height: calc(100vh - 100px);
			}
			${env.scope} .panel.ready .body {
				overflow-y: auto;

			}
			${env.scope} .panel .body .padding {
				padding: 25px 0 20px 0;
			}
			${env.scope} .panel .body .list {
				display: grid;
				grid-template-columns: max-content 1fr max-content;
				gap: 1rem;
			}
			${env.scope} .panel .body .content {
				display: grid; 
				grid-template-columns: 1fr 1fr; 
				gap: 0 2rem;
			}
			@media (max-width: 1199px) {
				${env.scope} .panel .body .content {
					grid-template-columns: 1fr;
				}
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
			<div style="line-height: 1;" class="title"></div>
		</div>

		<div class="body" >
			<div class="container">
				<div class="content">
					<div id="PANELBODY"></div>
					<div id="PANELORDER"></div>
				</div>
			</div>
		</div>
	</div>
	<script>
		(panel => {
			const hand = panel.querySelector('.hand')
			const body = panel.querySelector('.body')
			let t
			hand.addEventListener('click', () => {
				body.scrollTo(0, 0)
				panel.classList.toggle('show')
				panel.classList.remove('ready')
				clearTimeout(t)
				t = setTimeout(() => {
					if (!panel.classList.contains('show')) return
					panel.classList.add('ready')
				}, 500)
			})
		})(document.currentScript.previousElementSibling)
	</script>
`
export const SUM = (sum) => `${cost(sum)}${common.unit()}`
export const TITLE = (obj) => `<b>${obj.length}</b> ${words(obj.length, 'позиция','позиции','позиций')} на <b>${SUM(obj.sum)}</b>`
export const ORDER = (data, env) => data.result && data.list.length ? `
	<div class="padding">
		Форма
	</div>
` : ``
export const BODY = (data, env) => data.result && data.list.length ? `
	<div class="padding">
		<div class="list">
			${data.list.map(mod => showPos(mod, env)).join('')}
		</div>
	</div>
	
	<script type="module">
		import { TITLE, SUM } from "${env.layer.tpl}"
		const div = document.getElementById("${env.layer.div}")
		const panel = div.closest('.panel')
		const title = panel.querySelector('.title')
		const state = {
			list: []
		}
		const recalc = () => {
			state.length = 0
			state.sum = 0
			for (const store of state.list) {
				if (!Number(store.count)) continue
				state.length++
				state.sum += Number(store.sum)
			}
		}
		panel.classList.add('up')
		for (const block of panel.querySelectorAll('.blocksum')) {
			const mod = block.dataset
			const input = block.querySelector('input[type=number]')
			const modsum = block.querySelector('.modsum')
			state.list.push(mod)
			input.addEventListener('input', () => {
				mod.count = input.value
				mod.sum = mod.cost * mod.count
				modsum.innerHTML = SUM(mod.sum)
				recalc()
				title.innerHTML = TITLE(state)
				fetch('/-cart/set-add?order_id&count=' + mod.count +'&model_nick='+mod.model_nick+'&brand_nick='+mod.brand_nick+'&item_num='+mod.item_num+'&partner=${env.theme.partner || ""}').catch(e => console.log(e))
			})
			const del = block.querySelector('.del')
			del.addEventListener('click', async () => {
				await fetch('/-cart/set-remove?order_id&model_nick='+mod.model_nick+'&brand_nick='+mod.brand_nick+'&item_num='+mod.item_num+'&partner=${env.theme.partner || ""}').catch(e => console.log(e))
				const Client = await window.getClient()
				await Client.global('cart')
			})
		}
		recalc()
		title.innerHTML = TITLE(state)
	</script>
` : `
	<!-- В заказе ничего нет -->
	<script>
		(body => {
			const panel = body.closest('.panel')
			panel.classList.remove('up')
		})(document.currentScript.parentElement)
	</script>
`

const showPos = (mod, env) => `
	
	<div>${mod.images?.[0] ? showImage(mod) : ''}</div>
	<div>
		<div>${mod.Серия}</div>
		<div>${mod.Код || mod.model_title} на ${mod.Рамок} рамок</div>
		<div><b>${cost(mod.Цена)}${common.unit()}</b></div>
	</div>
	<div class="blocksum" 
		data-brand_nick="${mod.brand_nick}" 
		data-model_nick="${mod.model_nick}"
		data-item_num="${mod.item_num}"
		data-sum="${mod.sum}"
		data-cost="${mod.Цена || 0}" data-count="${mod.count || 0}"
		style="
			align-self: flex-start;
			text-align:right;
			display: grid;
			gap:8px;
			grid-template-columns: max-content max-content;
			grid-template-areas: 'input remove' 'sum .';
		"
	>
		<div style="grid-area: input;">${number.INPUT({min:0, max:1000, value:mod.count, name:mod.model_nick})}</div>
		<div style="grid-area: sum"><b class="modsum">${SUM(mod.sum)}</b></div>
		<div style="grid-area: remove">
			<button class="del" style="padding:0; margin:0; background:transparent; border:none">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M20 6H16V5C16 4.20435 15.6839 3.44129 15.1213 2.87868C14.5587 2.31607 13.7956 2 13 2H11C10.2044 2 9.44129 2.31607 8.87868 2.87868C8.31607 3.44129 8 4.20435 8 5V6H4C3.73478 6 3.48043 6.10536 3.29289 6.29289C3.10536 6.48043 3 6.73478 3 7C3 7.26522 3.10536 7.51957 3.29289 7.70711C3.48043 7.89464 3.73478 8 4 8H5V19C5 19.7956 5.31607 20.5587 5.87868 21.1213C6.44129 21.6839 7.20435 22 8 22H16C16.7956 22 17.5587 21.6839 18.1213 21.1213C18.6839 20.5587 19 19.7956 19 19V8H20C20.2652 8 20.5196 7.89464 20.7071 7.70711C20.8946 7.51957 21 7.26522 21 7C21 6.73478 20.8946 6.48043 20.7071 6.29289C20.5196 6.10536 20.2652 6 20 6ZM10 5C10 4.73478 10.1054 4.48043 10.2929 4.29289C10.4804 4.10536 10.7348 4 11 4H13C13.2652 4 13.5196 4.10536 13.7071 4.29289C13.8946 4.48043 14 4.73478 14 5V6H10V5ZM17 19C17 19.2652 16.8946 19.5196 16.7071 19.7071C16.5196 19.8946 16.2652 20 16 20H8C7.73478 20 7.48043 19.8946 7.29289 19.7071C7.10536 19.5196 7 19.2652 7 19V8H17V19Z" fill="#D9AE00"/>
				</svg>
			</button>
		</div>
	</div>
`
const showImage = mod => `
	<img alt="" width="80" height="70" src="/-imager/webp?fit=contain&h=100&w=100&src=${mod.images[0]}">
`