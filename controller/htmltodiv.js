import { animate } from './animate.js'
import { evalScripts } from './evalScripts.js'
export const htmltodiv = (html, div, anim = 'opacity') => {
	div.innerHTML = html
	const promise = evalScripts(div)
	animate('div', div, anim, promise)
	return promise
}