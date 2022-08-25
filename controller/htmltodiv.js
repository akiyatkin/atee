import { animate } from './animate.js'
import { evalScripts } from './evalScripts.js'
export const htmltodiv = (html, div) => {
	div.innerHTML = html
	const promise = evalScripts(div)
	animate('div', div, promise, 'opacity')
	return promise
}