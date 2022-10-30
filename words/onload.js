export default (fn) => {
	if (document.readyState === "complete") fn()
	else window.addEventListener('load', fn)	
}