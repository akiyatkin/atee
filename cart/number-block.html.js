const number = {}
number.css = ['-cart/number-block.css']

//import number from "/-cart/number-block.html.js"
//export const css = [...number.css]
//${number.INPUT({min:0, max:4, value:0, name:mod.model_nick})}

//data = {min, max, value, name}
number.INPUT = (data, env) => `
	<div class="number-block">
		<button class="minus" type="button" onclick="this.nextElementSibling.stepDown(); this.nextElementSibling.dispatchEvent(new Event('change')); this.nextElementSibling.dispatchEvent(new Event('input'))">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M15.8335 9.16663H4.16683C3.94582 9.16663 3.73385 9.25442 3.57757 9.4107C3.42129 9.56698 3.3335 9.77895 3.3335 9.99996C3.3335 10.221 3.42129 10.4329 3.57757 10.5892C3.73385 10.7455 3.94582 10.8333 4.16683 10.8333H15.8335C16.0545 10.8333 16.2665 10.7455 16.4228 10.5892C16.579 10.4329 16.6668 10.221 16.6668 9.99996C16.6668 9.77895 16.579 9.56698 16.4228 9.4107C16.2665 9.25442 16.0545 9.16663 15.8335 9.16663Z" fill="black"/>
			</svg>
		</button>
		<input name="${data.name || ''}" type="number" min="${data.min || 0}" max="${data.max || 100}" value="${data.max || 0}">
		<button class="plus" type="button" onclick="this.previousElementSibling.stepUp(); this.previousElementSibling.dispatchEvent(new Event('change')); this.previousElementSibling.dispatchEvent(new Event('input'))">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M15.8335 9.16665H10.8335V4.16665C10.8335 3.94563 10.7457 3.73367 10.5894 3.57739C10.4331 3.42111 10.2212 3.33331 10.0002 3.33331C9.77915 3.33331 9.56719 3.42111 9.41091 3.57739C9.25463 3.73367 9.16683 3.94563 9.16683 4.16665V9.16665H4.16683C3.94582 9.16665 3.73385 9.25444 3.57757 9.41072C3.42129 9.567 3.3335 9.77897 3.3335 9.99998C3.3335 10.221 3.42129 10.433 3.57757 10.5892C3.73385 10.7455 3.94582 10.8333 4.16683 10.8333H9.16683V15.8333C9.16683 16.0543 9.25463 16.2663 9.41091 16.4226C9.56719 16.5788 9.77915 16.6666 10.0002 16.6666C10.2212 16.6666 10.4331 16.5788 10.5894 16.4226C10.7457 16.2663 10.8335 16.0543 10.8335 15.8333V10.8333H15.8335C16.0545 10.8333 16.2665 10.7455 16.4228 10.5892C16.579 10.433 16.6668 10.221 16.6668 9.99998C16.6668 9.77897 16.579 9.567 16.4228 9.41072C16.2665 9.25444 16.0545 9.16665 15.8335 9.16665Z" fill="black"/>
			</svg>
		</button>
	</div>
`

export default number