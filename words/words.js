export const words = (count, one, two, five) => {
	if (!count) count = 0;
	if (count > 20) {
		const str = count.toString();
		count = str[str.length - 1];
		let count2 = str[str.length - 2];
		if (count2 == 1) return five; //xxx10-xxx19 (иначе 111-114 некорректно)
	}
	if (count == 1) {
		return one
	} else if (count > 1 && count < 5) {
		return two
	} else {
		return five
	}
}