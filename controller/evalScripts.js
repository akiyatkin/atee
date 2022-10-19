
export const evalScripts = div => {
	const scripts = []
	let i = 0
	for (const old of div.getElementsByTagName("script")) {
		let p
		if (old.src) {
			p = new Promise((resolve, reject) => {
				const fresh = document.createElement("script")
				fresh.src = old.src
				document.head.append(fresh)
				resolve()
			})
		} else {
			p = new Promise((resolve, reject) => {
				const fresh = document.createElement("script")
				fresh.type = old.type
				fresh.id = old.id || 'evalScripts_' + i + '_' + Date.now()
				fresh.addEventListener('ready', resolve)
				if (old.id) {
					fresh.textContent = old.textContent + `;(script => {
						script.dispatchEvent(new Event("ready"))
					})(document.getElementById("${fresh.id}"))`
				} else {
					fresh.textContent = old.textContent + `;(script => {
						script.removeAttribute('id')
						script.dispatchEvent(new Event("ready"))
					})(document.getElementById("${fresh.id}"))`
				}
				old.replaceWith(fresh)
			})
		}
		scripts.push(p)
		i++
	}	
	return Promise.all(scripts)
}