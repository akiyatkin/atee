CREATE TABLE IF NOT EXISTS `cart_orders` (
	`order_id` MEDIUMINT unsigned NOT NULL AUTO_INCREMENT,
	`user_id` MEDIUMINT unsigned NOT NULL COMMENT 'Автор кто непосредственно создал заказ, владельцы указаны в cart_userorders',    
	`order_nick` varchar(31) NOT NULL COLLATE latin1_bin COMMENT 'Номер из даты с проверкой уникальности',
	`commentuser` TEXT NOT NULL DEFAULT '' COMMENT '',
	`commentmanager` TEXT NOT NULL DEFAULT '' COMMENT '',
	`email` TINYTEXT NOT NULL DEFAULT '' COMMENT '1. У текущего user_id нет - будет добавлен. 2. У текущего другой, если свободен, то будет добавлен текущему пользователю 3. Для менеджера. Создаётся новый пользователь или заявка привяжется к существующему пользователю. Если телефон у одного, почта у другова заявка привяжется к обоим.',
	`phone` TINYTEXT NOT NULL DEFAULT '' COMMENT '1. У текущего user_id нет - будет добавлен. 2. У текущего другой, если свободен, то будет добавлен текущему пользователю 3. Для менеджера. Создаётся новый пользователь или заявка привяжется к существующему пользователю. Если телефон у одного, почта у другова заявка привяжется к обоим.',
	`name` TINYTEXT NOT NULL DEFAULT '',
	`callback` ENUM('yes','no') NULL DEFAULT NULL COMMENT 'Перезвонить или нет',
	`status` ENUM('wait','pay','paid', 'check','complete','cancel') NOT NULL DEFAULT 'wait' COMMENT 'Доступные статусы',
	`lang` ENUM('ru','en') NULL DEFAULT NULL COMMENT 'Определёный язык интерфейса посетителя',    
	`paid` int(1) unsigned NULL COMMENT 'Метка была ли онлайн оплата',
	`pay` ENUM('self','card','corp','perevod') NULL DEFAULT NULL,
	`paydata` TEXT NULL DEFAULT NULL COMMENT 'Данные оплаты',    
	`city_id` MEDIUMINT NULL DEFAULT NULL COMMENT 'Город определённый или изменённый, для сортировки заявок и расчёта стоимости доставки. Может отличаться от выбранного города в заказе',
	`freeze` int(1) unsigned NULL COMMENT 'Метка заморожены ли позиции',
	`partnerjson` TEXT NULL DEFAULT NULL COMMENT 'Данные купона из option.json на момент фриза, если потребуется разбирать откуда такая цена',
	`transport` ENUM(
		'city','self','cdek_pvz', 'any',
		'cdek_courier','pochta_simple','pochta_1',
		'pochta_courier'
	) NULL DEFAULT NULL COMMENT 'Выбор пользователя',
	`pvz` TEXT NULL COMMENT 'Адрес в городе',
	`address` TEXT NULL COMMENT 'Адрес в городе',
	`tk` TINYTEXT NULL COMMENT 'Рекомендуемая ТК',
	`zip` TEXT NULL COMMENT 'Индекс',

	`referrer_host` varchar(31) NOT NULL DEFAULT '' COMMENT '',
	`source` varchar(31) NOT NULL DEFAULT '' COMMENT '',
	`content` varchar(31) NOT NULL DEFAULT '' COMMENT '',
	`campaign` varchar(31) NOT NULL DEFAULT '' COMMENT '',
	`medium` varchar(31) NOT NULL DEFAULT '' COMMENT '',
	`term` varchar(31) NOT NULL DEFAULT '' COMMENT '',

	`referrer_host_nick` varchar(31) NOT NULL DEFAULT '' COMMENT '',
	`source_nick` varchar(31) NOT NULL DEFAULT '' COLLATE latin1_bin COMMENT '',
	`content_nick` varchar(31) NOT NULL DEFAULT '' COLLATE latin1_bin COMMENT '',
	`campaign_nick` varchar(31) NOT NULL DEFAULT '' COLLATE latin1_bin COMMENT '',
	`medium_nick` varchar(31) NOT NULL DEFAULT '' COLLATE latin1_bin COMMENT '',
	`term_nick` varchar(31) NOT NULL DEFAULT '' COLLATE latin1_bin COMMENT '',

	`count` SMALLINT unsigned NOT NULL DEFAULT 0 COMMENT 'Кэш количества позиций(строчек) в корзине. Для сводной таблицы МЕНЕДЖЕРА',
	`sum` INT unsigned NOT NULL DEFAULT 0 COMMENT 'Кэш суммы заказа без стоимости доставки. Для сводной таблицы МЕНЕДЖЕРА',

	`weight` MEDIUMINT unsigned NOT NULL DEFAULT 0 COMMENT 'Кэш - расчётный вес',
	`datecreate` DATETIME NULL COMMENT 'Дата создания заказа, в момент добавления первой позиции',
	`datefreeze` DATETIME NULL COMMENT 'Дата последней заморозки заказа, если такая была',
	`datecancel` DATETIME NULL COMMENT 'Дата отмены',
	`datewait` DATETIME NULL COMMENT 'Дата изменения статуса ожидание, активные заказы в этом статусе',
	`datepay` DATETIME NULL COMMENT 'Дата изменения статуса ожидает оплаты',
	`datepaid` DATETIME NULL COMMENT 'Дата подтверждения оплаты',
	`datecheck` DATETIME NULL COMMENT 'Дата изменения статуса отправлен на проверку',
	`datecomplete` DATETIME NULL COMMENT 'Дата изменения статуса выполнен',
	`dateemail` DATETIME NULL COMMENT 'Дата email пользователю',
	`dateedit` DATETIME NULL COMMENT 'Дата редактирования',
	
	PRIMARY KEY (`order_id`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=1 ;


CREATE TABLE IF NOT EXISTS `cart_transports` (
	`order_id` MEDIUMINT unsigned NOT NULL,
	`type` ENUM(
		'city','self','cdek_pvz', 'any',
		'cdek_courier','pochta_simple','pochta_1',
		'pochta_courier'
	) NULL COMMENT 'Выбор пользователя',
	`transport_cost` SMALLINT NULL COMMENT 'Цена',
	`min` TINYINT NULL COMMENT 'Cрок в днях',
	`max` TINYINT NULL COMMENT 'Cрок в днях',
	UNIQUE INDEX (`order_id`,`type`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `cart_basket` (
	`order_id` MEDIUMINT unsigned NOT NULL,

	`model_nick` varchar(31) COLLATE latin1_bin NOT NULL COMMENT 'model_id не можем сохранять, так как может поменяться',
	`brand_nick` varchar(31) COLLATE latin1_bin NOT NULL COMMENT '',
	`item_num` SMALLINT unsigned NOT NULL DEFAULT 0 COMMENT '',

	`hash` CHAR(8) COLLATE latin1_bin NULL COMMENT 'хэш данных позиции - было ли изменение в описании замороженной позиции используется до распаковки json и сравнения его с позицией в каталоге',
	`json` MEDIUMTEXT NULL COMMENT 'freeze json позиции с собранным kits. Не может быть пустой объект - если позиции на момент фриза в каталоге нет, то и в корзине позиция не покажется, так как будет удалена по событию из showcase',
	
	`count` SMALLINT unsigned NOT NULL COMMENT '',
	
	`dateadd` DATETIME NULL DEFAULT NULL COMMENT 'Дата добавления, в том числе в замороженный заказ менеджером, позиция не обновляется из каталога если уже была',
	`dateedit` DATETIME NULL DEFAULT NULL COMMENT 'Дата изменений, в том числе в замороженном заказ менеджером, позиция не обновляется с каталога',

	UNIQUE INDEX (`order_id`, `brand_nick`, `model_nick`, `item_num`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci AUTO_INCREMENT=1;


CREATE TABLE IF NOT EXISTS `cart_userorders` (
	`order_id` MEDIUMINT unsigned NOT NULL,
	`user_id` MEDIUMINT unsigned NOT NULL,
	PRIMARY KEY (`order_id`, `user_id`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `cart_actives` (
	`user_id` MEDIUMINT unsigned NOT NULL,
	`order_id` MEDIUMINT unsigned NOT NULL,
	PRIMARY KEY (`user_id`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- CREATE TABLE IF NOT EXISTS `cart_partners` (
--  	`order_id` int(11) unsigned NOT NULL,
-- 	`partner_nick` varchar(31) COLLATE latin1_bin NOT NULL,
-- 	PRIMARY KEY (`order_id`)
-- ) DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;