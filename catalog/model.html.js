export const unit = () => '&nbsp;руб.'
export const link = {
	model: (model) => `/catalog/${model.brand_nick}/${model.model_nick}`
}
export default { unit, link } 