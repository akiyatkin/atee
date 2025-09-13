const Drag = {}

Drag.make = (div, actionsave, callback) => {
	let activeElement
	let nextElement = false
	
	for (const a of div.getElementsByTagName('a')) {
		a.draggable = false
	}
	const activate = (r) => {
		for (const a of div.getElementsByClassName('item')) {
			a.draggable = r
		}
	}

	if (div.tagName == 'TBODY') {
		const table = div.closest('table')
		const thead = table.getElementsByTagName('thead')[0]
		const tr = thead.children[0]
		const td = tr.children[0]

		const moveon = document.createElement('span')
		moveon.innerHTML = '⇵'
		moveon.style.display = 'none'

		const moveoff = document.createElement('span')
		moveoff.innerHTML = '⠿'
		moveoff.style.display = ''

		const move = document.createElement('span')
		move.style.userSelect = 'none'
		move.style.paddingRight = '1ch'
		move.style.cursor = "pointer"
		move.append(moveon)
		move.append(moveoff)
		td.prepend(move)
		
		moveon.addEventListener('click', () => {
			moveon.style.display = 'none'
			moveoff.style.display = ''
			activate(false)
		})
		moveoff.addEventListener('click', () => {
			moveon.style.display = ''
			moveoff.style.display = 'none'
			activate(true)
		})
		
	} else {
		activate(true)
	}
	div.addEventListener('dragstart', (event) => {
		const item = event.target
		if (!item.classList.contains('item')) return
		if (!item.dataset.id) return
		activeElement = item
		item.classList.add('selected')
	})
	

	div.addEventListener('dragend', async (event) => {
		if(!activeElement) return false
		const item = event.target
		const id = activeElement.dataset.id
		activeElement = false
		item.classList.remove('selected')
		if (nextElement === false) return
		const next_id = nextElement === null ? '' : nextElement.dataset.id
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