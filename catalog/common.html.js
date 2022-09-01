const common = {}

common.unit = () => '&nbsp;руб.'
common.propval = (mod, prop) => mod[prop] ?? mod.more[prop]
common.prtitle = (mod, pr) => common.propval(mod, pr.value_title)
common.prnick = (mod, pr) => common.propval(mod, pr.value_nick)

export default common

