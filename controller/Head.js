export const Head = {
	qs: q => document.head.querySelector(q) || {},
	rules: {
		title: title => document.title = title,
		description: descr => {
			Head.qs('meta[name=description]').content = descr
		},
		keywords: keys => {
			Head.qs('meta[name=keywords]').content = keys
		},
		image_src: src => {
			Head.qs('meta[property="og:image"]').content = src
			Head.qs('link[rel=image_src]').href = src
		}
	},
	accept: obj => {
		for (const i in obj) {
			if (!Head.rules[i]) continue
			Head.rules[i](obj[i])
		}
	}
}