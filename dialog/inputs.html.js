import nicked from "/-nicked"

const tpl = {
	switch: (name, title, action, is, valuetrue, valuefalse) => {
		return `
		${title}: <span class="a">${is ? valuetrue : valuefalse}</span>
		<script>
			(btn => {
				btn.addEventListener('click', async () => {
					const request = await import('/-dialog/request.js').then(r => r.default)
					const ans = await request('${action}', btn)
					btn.innerHTML = ans['${name}'] ? "${valuetrue}" : "${valuefalse}"
				})
			})(document.currentScript.previousElementSibling)
		</script>`
	},
	area: (name, title, action, value) => {
		const id = 'inputs-' + nicked(title)
		return `
			<div class="float-label">
				<div name="${name}" contenteditable id="${id}" class="input">${value}</div>
				<script>
					(div => {
						div.addEventListener('input', async () => {
							const requestit = await import('/-dialog/requestit.js').then(r => r.default)
							requestit(div, '${action}', {post:{${name}: div.innerHTML}})
						})
					})(document.currentScript.previousElementSibling)
				</script>
				<label for="${id}">${title}</label>
			</div>
		`
	},
	text: (name, title, action, value) => {
		const id = 'inputs-' + nicked(title)
		return `
			<div class="float-label">
				<input name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="input">
				<script>
					(input => {
						input.addEventListener('input', async () => {
							const requestit = await import('/-dialog/requestit.js').then(r => r.default)
							requestit(input, '${action}', {post:{${name}: input.value}})
						})
					})(document.currentScript.previousElementSibling)
				</script>
				<label for="${id}">${title}</label>
			</div>
		`
	},
	textstatus: (name, title, action, value) => {
		const id = 'doit-' + nicked(title)
		return `
			<div class="float-label">
				<input name="${name}" type="text" id="${id}" value="${value}" placeholder="${title}" class="input">
				<script>
					(input => {
						input.addEventListener('input', async () => {
							const sendit = await import('/-dialog/sendit.js').then(r => r.default)
							const ans = await sendit(input, '${action}', {${name}: input.value})
						})
					})(document.currentScript.previousElementSibling)
				</script>
				<label for="${id}">${title}</label>
			</div>
		`
	}
}

export default tpl