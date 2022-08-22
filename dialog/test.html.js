import {start, end} from "/-modal/layout.html.js"
export const ROOT => () => `
	<span class="modalCallback">Показать окно</span>
	${start()}
	<p>
		Укажите ваш телефон, <br>мы перезвоним в рабочее время
	</p>
	${end()}
	<script type="module">
		import { Modal } from "/-modal/Modal.js"
		const id = id => document.getElementById(id)
		const div = id('{div}')
		const cls = (cls, el = div) => el.getElementsByClassName(cls)
		const btns = cls('modalCallback', document.body)
		for (const btn of btns) {
			btn.addEventListener('click', () => {
				Modal.show(div)	
			})
		}
	</script>
`