export const cost = (cost) => {
	cost = String(cost)
	let inp = '&nbsp;'
	const l = cost.length;
	if (l > 4) { //10000 = 10 000
		if (l > 6) { //1000000 = 1 000 000
			const last = cost.substr(l - 3, 3)
			const before = cost.substr(l - 6, 3);
			const start = cost.substr(0, l - 6)
			cost = start + inp + before + inp + last
		} else {
			const last = cost.substr(l - 3, 3)
			const start = cost.substr(0, l - 3)
			cost = start + inp + last
		}	
	}

	return cost;

}