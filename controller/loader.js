//depricated old version 23.11.25 use --import with overriding/register

import { pathToFileURL } from 'url'
import { readdir } from 'fs/promises'

const checkfromroot = async (path, context, defaultResolve) => {
	const res = defaultResolve(path, {
		...context,
		parentURL: pathToFileURL('./')
	}, defaultResolve).catch(() => false)
	return res
}

export const resolve = async (specifier, context, defaultResolve) => {
	const key = specifier[0] === '/' ? specifier : specifier + context.parentURL //conditions, importAssertions не могут различваться у одного parentURL и specifier
	if (resolve.cache[key]) return resolve.cache[key]

	const res = (async () => {
		let res
		if (specifier[0] === '/') {
			specifier = specifier.slice(1)
			res = await checkfromroot('./' + specifier, context, defaultResolve)
			if (res) return res
			if (specifier[0] === '-') {
				specifier = specifier.slice(1)
				
				res = await checkfromroot('./' + specifier, context, defaultResolve)
				if (res) return res				

				res = await checkfromroot('@atee/' + specifier, context, defaultResolve)
				if (res) return res

				res = await checkfromroot('@ange/' + specifier, context, defaultResolve)
				if (res) return res

			}
		}
		const r = await defaultResolve(specifier, context, defaultResolve) //Проверка относительного адреса
		
		return r
	})().then(res => {
		res.shortCircuit = true
		return res
	}).catch(e => {
		throw e
	})
	resolve.cache[key] = res
	return res
}
resolve.cache = {}