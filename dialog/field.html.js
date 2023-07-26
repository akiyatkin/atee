import nicked from "/-nicked"
const tpl = {}

tpl.switch = (name, title, action, is, valuetrue, valuefalse) => {
	return `
	<div>
		<div style="display: inline-block; cursor:pointer; padding:calc(.75rem / 3) 0">${title}: <span class="a">${is ? valuetrue : valuefalse}</span></div>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					const send = await import('/-dialog/send.js').then(r => r.default)
					const ans = await send('${action}')
					btn.querySelector('.a').innerHTML = ans['${name}'] ? "${valuetrue}" : "${valuefalse}"
				})
			})(document.currentScript.previousElementSibling)
		</script>
	</div>`

}
tpl.area = (name, title, action, value) => {
	const id = 'inputs-' + nicked(title)
	return `
		<div class="float-label">
			<div name="${name}" contenteditable id="${id}" class="field">${value}</div>
			<script>
				(field => {
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const ans = await sendit(field, '${action}', {${name}: field.innerHTML})
					})
				})(document.currentScript.previousElementSibling)
			</script>
			<label for="${id}">${title}</label>
		</div>
	`
}

tpl.text = (name, title, action, value) => {
	const id = 'inputs-' + nicked(title)
	return `
		<div class="float-label">
			<input name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="field">
			<script>
				(field => {
					field.addEventListener('input', async () => {
						const sendit = await import('/-dialog/sendit.js').then(r => r.default)
						const ans = await sendit(field, '${action}', {${name}: field.value})
					})
				})(document.currentScript.previousElementSibling)
			</script>
			<label for="${id}">${title}</label>
		</div>
	`
}

export default tpl