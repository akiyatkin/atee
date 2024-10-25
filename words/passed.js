//depricated перенесено в age.pass
import words from "/-words/words.js"
const format = (dif, a, b, c) => {
	dif = Math.round(dif)
	return dif + ' ' + words(dif, a, b, c)
}
export const passed = (dif) => {
	if (!dif) dif = 0
	dif = dif / 1000
	if (dif < 60) return format(dif, 'секунду','секунды','секунд')
	
	dif = dif / 60 //минут
	if (dif < 60) return format(dif, 'минуту', 'минуты', 'минут')

	dif = dif / 60 //часов
	if (dif < 24) return format(dif, 'час','часа','часов')

	dif = dif / 24 //дней
	if (dif < 10) return format(dif, 'день','дня','дней')

	dif = dif / 7 //недель
	if (dif < 5) return format(dif, 'неделю', 'недели','недель')

	dif = dif / 4.345 //месяцев
	if (dif < 12) return format(dif, 'месяц', 'месяца','месяцев')

	dif = dif / 12 //лет
	return format(dif, 'год','года','лет')
}
export default passed