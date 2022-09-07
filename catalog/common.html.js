const common = {}

common.unit = () => '&nbsp;руб.'
common.propval = (mod, prop) => mod[prop] ?? mod.more[prop] ?? (mod.items && mod.item_num ? (mod.items[mod.item_num - 1][prop] ?? mod.items[mod.item_num - 1].more[prop]) : '')
common.prtitle = (mod, pr) => common.propval(mod, pr.value_title)
common.prnick = (mod, pr) => common.propval(mod, pr.value_nick)

export default common

