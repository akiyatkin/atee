import cards from "/-shop/cards.html.js"

const Ecommerce = {}
export default Ecommerce
/*
	Логика на усмотрение автора сайта
	

	detail — просмотр товара;							+
	add — добавление товара в корзину;					+
	remove — удаление товара из корзины;				+
	purchase — покупка;									+
	promoView — просмотр внутренней рекламы;			-
	promoClick — клик по внутренней рекламе.			-
*/

Ecommerce.getProduct = (data, {coupon, item, listname, position, group_nick, quantity = null}) => {
	/*
		Для быстрого поиска
		item.brendmodel
		item.brendart
		item.naimenovanie
		item.brend
		item.staraya-cena
		item.cena
		item.model
		item.art
		group.category
	*/
	const gain = (name) => cards.getSomeTitle(data, item, name)
	const group = data.groups[group_nick]
	const cena = item['cena']?.[0]
	const oldcost = item['staraya-cena']?.[0]
	const product = {
		"id": item.brendmodel[0],
		"sku": item.brendart[0],
		"name" : cards.getItemName(data, item), //gain('naimenovanie') || gain('brend') gain('model'),
		"brand": gain('brend'),
		"variant": gain('art'),
		"category": group.category, //Поддерживается иерархия категорий до 5 уровней вложенности. Разделителем уровней является символ /. Например, "Одежда / Мужская одежда / Футболки"
		"list": listname, //Список к которому относится товар
        "position": position //Позиция товара в списке. Например, 2
	}
	if (quantity !== null) 	product.quantity = quantity
	if (cena) 				product.price = cena
	if (oldcost && cena) 	product.discount = oldcost - cena //В валюте цены, сумма скидки
	if (coupon) 			product.coupon = coupon //coupon:env.theme.partner
	return product
}
Ecommerce.getPush = () => {
	window.dataLayer = window.dataLayer || []
	const ecommerce = {
		"currencyCode": "RUB"
	}
	dataLayer.push({ecommerce})
	return ecommerce
}




// Воронка: Изучил варианты (impressions), Кликнул (click). Затем очевидные: Детали (detail), Корзина (add), Покупка (purchase)
/*
	ДОГМЫ о событиях о product
	1. После impressions переход в detail только с click. 
		Бывает immpressions на все позиции модели но перейти можно только на 1 позицию c click. У других click будет внутри модели.
	2. Без impressions click не может произойти. 
		click это процент от impressions меньше 100%
	3. После click всегда происходит detail (исключение правая кнопка мыши тоже click, но открыть в новой вкладке может быть и не нажато).
	4. Без click detail, тоже может произходить. 
		detail это процент от click больше 100%
		Получаем процент покупок после click и без click. Скорей всего покупок без кликов обычно не должно быть. 
			Последовательность может быть нарушена, но просмотр вариантов imporessions и клик должны перед покупкой произойти.
				Получается есть важные корзины с кликом и случайные корзины без клика
*/
	
Ecommerce.impressions = products => {
	const ecommerce = Ecommerce.getPush()
	ecommerce.impressions = products
}
Ecommerce.click = products => {
	//click — клик по товару в списке; 
	//impressions есть и в быстром поиске с click со своим именем списка (list). 
	//Клик это 2ой переход на detail. detail без клика это прямые заходы.
	/*
		
															       Варианты ААА из-за ДОГМ
																	  	  А или Б
		Клик по 1 модели с 5 позициями 				- клик по 1 позиции 	или по 5 позициям
		Переход по позициям внутри модели 			- считается кликом 		или не считется кликом
		Как разделять клики из списка и из карточки - list: Модель, Каталог или его и нет
	*/
	const ecommerce = Ecommerce.getPush()
	ecommerce.click = {products}
}


//Очевидные
Ecommerce.detail = products => {
	const ecommerce = Ecommerce.getPush()
	ecommerce.detail = {products}
}
Ecommerce.add = products => {
	const ecommerce = Ecommerce.getPush()
	ecommerce.add = {products}
}
Ecommerce.remove = products => {
	const ecommerce = Ecommerce.getPush()
	ecommerce.remove = {products}
}
Ecommerce.purchase = (products, order_nick) => {
	const ecommerce = Ecommerce.getPush()
	ecommerce.purchase = {products}
	if (order_nick) ecommerce.actionField = {id: order_nick}
}