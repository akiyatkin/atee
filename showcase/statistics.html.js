import { ago } from "/-words/ago.js"
export const ROOT = (data, env) => !data.result ? `<p>${data.msg}</p>` : `
	<h1>Обработка цен</h1>
	<div style="padding:1rem 0;">
		<button class="a" onclick="this.nextElementSibling.classList.toggle('show')">Обработки по умолчанию</button>
		<div class="${env.sid}h">${Object.entries(data.handlers).map(([name, val]) => {
				return '<b>' + name + '</b>: ' + val + '<br>'
			}).join('')}
		</div>
		<style>
			.${env.sid}h {
				display: none;
				padding:0.5rem;
				border: dashed 1px #eee;
			}
			.${env.sid}h.show {
				display: block;
			}
		</style>
		<br><button class="a" onclick="this.nextElementSibling.classList.toggle('show')">Купоны</button>
		<div class="${env.sid}c">${Object.entries(data.partners || {}).map(showCoupon).join('')}
		</div>
		<style>
			.${env.sid}c {
				display: none;
				padding:0.5rem;
				border: dashed 1px #eee;
			}
			.${env.sid}c.show {
				display: block;
			}
		</style>
	</div>
	${data.prices.map(showPrice).join('')}
`
const showCoupon = ([name, val]) => `
	<b>${val.title}</b>: <b>${val.cost || ''} ${val.discount || ''}</b><br>${val.descr || ''}<br>
`
const showPrice = (price) => `
	<div style="margin-bottom:1rem">
		<b>${price.price_title} ${price.skidka ? showSkidka(price) : ''}</b>
		${price.props.map(showProp).join('')}
		${price.usd ? showUsd(price) : ''}
	</div>
`
const showProp = (prop) => `
	<div>${prop.prop_title}: <code>${prop.synonyms.join(', ')} ${prop.handler || ''}</code></div>
`
const showUsd = (price) => `
	<div>Курс: ${price.usd}, (${price.usdlist.join(', ')})</div>
`
const showSkidka = (price) => `
	<span style="color:red">${price.skidka}%</span>
`