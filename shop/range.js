const range = {}
export default range

range.getValue = (input, min, max, direction, val) => {
	const value_title = Number(input.value) || 0
	let value_nick = String(value_title).replace('.','-')
	let click = false
	if (value_nick <= min) {
		value_nick = min
		direction = 'from'
	} else if (value_nick >= max) {
		direction = 'upto'
		value_nick = max
	} else {
		const old = val
		if (value_nick == old) {
			click = true
		}
	}
	return {value_nick, direction, click}
}