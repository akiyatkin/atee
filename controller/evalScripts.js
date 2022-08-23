export const evalScripts = div => {
	const scripts = []
	let i = 0
	for (const old of div.getElementsByTagName("script")) {
		let p
		if (old.src) {
			if (!evalScriptsInNode[old.src]) {
				evalScriptsInNode[src] = new Promise((resolve, reject) => {
					const fresh = document.createElement("script");					
					fresh.src = old.src
					document.head.append(fresh)
					resolve()
				})
			}
			p = evalScriptsInNode[src]
		} else {
			p = new Promise((resolve, reject) => {
				const fresh = document.createElement("script");
				fresh.type = old.type
				fresh.addEventListener('ready', resolve)
				fresh.textContent = old.textContent + ';document.getElementById("'+div.id+'").getElementsByTagName("script")['+i+'].dispatchEvent(new Event("ready"))'
				old.replaceWith(fresh)
			})
		}
		scripts.push(p)
		i++
	}	
	return Promise.all(scripts)
}