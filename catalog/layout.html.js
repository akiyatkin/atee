const layout = {}

layout.unit = () => '&nbsp;руб.'
layout.ptitle = (mod, prop) => mod[prop] ?? mod.more[prop]
layout.prtitle = (mod, pr) => layout.ptitle(mod, pr.value_title)
layout.prnick = (mod, pr) => mod[pr.value_nick] ?? mod.more[pr.value_nick]

export default layout

