const qs = q => document.head.querySelector(q) || {}
export const HtmlHead = {
	rules: {
		title: title => {
			document.title = title
		},
		description: descr => {
			qs('meta[name=description]').content = descr
		},
		keywords: keys => {
			qs('meta[name=keywords]').content = keys
		},
		image_src: src => {
			qs('meta[property="og:image"]').content = src
			qs('link[rel=image_src]').href = src
		},
		canonical: src => {
			qs('link[rel="canonical"]').href = src
		}
	},
	accept: obj => {
		for (const i in obj) {
			if (!HtmlHead.rules[i]) continue
			const div = document.createElement('div')
			div.innerHTML = obj[i]
			HtmlHead.rules[i](div.innerText)
		}
	}
}