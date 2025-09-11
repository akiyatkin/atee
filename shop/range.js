const range = {}
export default range

range.getValue = (input, min, max, direction, val, scale) => {
	const value_title = Number(input.value) || 0
	let value_nick = String(value_title)
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
	value_nick = value_nick * 10 ** (scale || 0)
	return {value_nick, direction, click}
}