const Drag = {}

Drag.make = (div, actionsave, callback) => {
	let activeElement
	let nextElement = false
	div.addEventListener('dragstart', (event) => {
		const item = event.target
		activeElement = item
		item.classList.add('selected')
	})
	for (const a of div.getElementsByTagName('a')) {
		a.draggable = false
	}
	for (const a of div.getElementsByClassName('item')) {
		a.draggable = true
	}

	div.addEventListener('dragend', async (event) => {
		const item = event.target
		const id = activeElement.dataset.id
		activeElement = false
		item.classList.remove('selected')
		if (nextElement === false) return
		const next_id = nextElement === null ? 0 : nextElement.dataset.id
		nextElement = false
		if (!actionsave) return
		let ans
		if (typeof actionsave == 'function') {
			ans = await actionsave({id, next_id})
		} else {
			const senditmsg = await import('/-dialog/senditmsg.js').then(r => r.default)
			ans = await senditmsg(div, actionsave, {id, next_id})	
		}
		if (callback) callback(ans)
	})
	div.addEventListener('dragover', (event) => {
		if (!activeElement) return
		event.preventDefault()
		const currentElement = event.target.closest('.item')
		if (!currentElement) return
		if (activeElement == currentElement) return
		nextElement = currentElement === activeElement.nextElementSibling ? currentElement.nextElementSibling : currentElement
		div.insertBefore(activeElement, nextElement)
		
	})

}

export default Drag