const Color = {
	VALUES: ['red', 'green','blue','orange','yellow'],
	get: (ordain) => {
		ordain--
		const index = ordain % Color.VALUES.length
		const color = Color.VALUES[index]
		return color
	}
}
export default Color
