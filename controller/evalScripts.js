const evalScriptsInNode = {}
export const evalScripts = div => {
	const scripts = []
	let i = 0
	for (const old of div.getElementsByTagName("script")) {
		let p
		if (old.src) {
			//if (!evalScriptsInNode[old.src]) {
				evalScriptsInNode[old.src] = new Promise((resolve, reject) => {
					const fresh = document.createElement("script");					
					fresh.src = old.src
					document.head.append(fresh)
					resolve()
				})
			//}
			p = evalScriptsInNode[old.src]
		} else {
			p = new Promise((resolve, reject) => {
				const fresh = document.createElement("script");
				fresh.type = old.type
				fresh.id = 'evalScripts_'+i+'_'+Date.now()
				fresh.addEventListener('ready', resolve)
				fresh.textContent = old.textContent + `;(script => {
					script.id = null
					script.dispatchEvent(new Event("ready"))
				})(document.getElementById("${fresh.id}"))`	
				old.replaceWith(fresh)
			})
		}
		scripts.push(p)
		i++
	}	
	return Promise.all(scripts)
}