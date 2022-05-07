export const SEO = {
	qs: q => document.head.querySelector(q) || {},
	rules: {
		title: title => document.title = title,
		description: descr => {
			SEO.qs('meta[name=description]').content = descr
		},
		keywords: keys => {
			SEO.qs('meta[name=keywords]').content = keys
		},
		image_src: src => {
			SEO.qs('meta[property="og:image"]').content = src
			SEO.qs('link[rel=image_src]').href = src
		}
	},
	accept: obj => {
		for (const i in obj) {
			SEO.rules[i](obj[i])
		}
	}
}