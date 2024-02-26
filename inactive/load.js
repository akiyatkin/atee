/*
	В шапке должен быть скрипт
	<script class="cls" data-src="...
*/
export default cls => {
	const script = document.head.getElementsByClassName(cls)[0]
	if (script.load) return script.load
	let resolve, reject
	script.load = new Promise((rs, rj) => {
		if (script.src) return rs()
		resolve = rs
		reject = rj
	})
	script.addEventListener('load', resolve)
	script.addEventListener('error', reject)
	script.src = script.dataset.src
	delete script.dataset.src
	return script.load
}