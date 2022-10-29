const onload = (fn) => {
	if (document.readyState === "complete") fn()
	else window.addEventListener('load', fn)	
}
export { onload }