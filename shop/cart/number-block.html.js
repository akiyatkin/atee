const number = {}
number.css = ['/-shop/cart/number-block.css']

//import number from "/-cart/number-block.html.js"
//export const css = [...number.css]
//${number.INPUT({min:0, max:4, value:0, name:mod.model_nick})}

//data = {min, max, value, name}
number.INPUT = (data, env) => `
	<div class="number-block">
		<button class="minus" type="button" onclick="this.nextElementSibling.stepDown(); this.nextElementSibling.dispatchEvent(new Event('change')); this.nextElementSibling.dispatchEvent(new Event('input'))">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round">
				<path d="M3 10H17" stroke-width="2" stroke="black"/>
			</svg>
		</button>
		<input name="${data.name || ''}" type="number" min="${data.min || 0}" max="${data.max || 100}" value="${data.value || 0}">
		<button class="plus" type="button" onclick="this.previousElementSibling.stepUp(); this.previousElementSibling.dispatchEvent(new Event('change')); this.previousElementSibling.dispatchEvent(new Event('input'))">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round">
				<path d="M10 3V17" stroke-width="2" stroke="black"/>
				<path d="M3 10H17" stroke-width="2" stroke="black"/>
			</svg>
		</button>
	</div>
`

export default number