-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               11.4.0-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.11.0.7065
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table ladasvet.ru.shop_actives
CREATE TABLE IF NOT EXISTS `shop_actives` (
  `user_id` mediumint(8) unsigned NOT NULL,
  `order_id` mediumint(8) unsigned NOT NULL,
  PRIMARY KEY (`user_id`) USING BTREE,
  KEY `FK_shop_actives_shop_orders` (`order_id`),
  CONSTRAINT `FK_shop_actives_shop_orders` FOREIGN KEY (`order_id`) REFERENCES `shop_orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_shop_actives_user_users` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_allitemgroups
CREATE TABLE IF NOT EXISTS `shop_allitemgroups` (
  `key_id` int(10) unsigned NOT NULL,
  `group_id` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`key_id`,`group_id`) USING BTREE,
  KEY `FK_sources_items_sources_values` (`key_id`) USING BTREE,
  KEY `FK_shop_items_shop_groups` (`group_id`) USING BTREE,
  CONSTRAINT `shop_allitemgroups_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `shop_groups` (`group_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `shop_allitemgroups_ibfk_2` FOREIGN KEY (`key_id`) REFERENCES `sources_values` (`value_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC COMMENT='Для быстрого поиска. Учитываются только позиции, которые не вложенны в подгруппы.';

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_basket
CREATE TABLE IF NOT EXISTS `shop_basket` (
  `order_id` mediumint(8) unsigned NOT NULL,
  `brendart_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'model_id не можем сохранять, так как может поменяться',
  `quantity` smallint(5) unsigned NOT NULL,
  `dateadd` datetime DEFAULT NULL COMMENT 'Дата добавления, в том числе в замороженный заказ менеджером, позиция не обновляется из каталога если уже была',
  `dateedit` datetime DEFAULT NULL COMMENT 'Дата изменений, в том числе в замороженном заказ менеджером, позиция не обновляется с каталога',
  `modification` text DEFAULT NULL,
  `json` mediumtext DEFAULT NULL COMMENT 'freeze json позиции с собранным kits. Не может быть пустой объект - если позиции на момент фриза в каталоге нет, то и в корзине позиция не покажется, так как будет удалена по событию из showcase',
  `json_hash` char(8) CHARACTER SET latin1 COLLATE latin1_bin DEFAULT NULL COMMENT 'хэш данных позиции - было ли изменение в описании замороженной позиции используется до распаковки json и сравнения его с позицией в каталоге',
  `json_cost` int(10) unsigned DEFAULT NULL COMMENT 'Только для аналитики, в аналитике json не разворачивается. Данные о позиции берутся из каталога. Но цена должна быть та что в моменте продажи.',
  PRIMARY KEY (`order_id`,`brendart_nick`) USING BTREE,
  CONSTRAINT `FK_shop_basket_shop_orders` FOREIGN KEY (`order_id`) REFERENCES `shop_orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_cards
CREATE TABLE IF NOT EXISTS `shop_cards` (
  `group_id` smallint(6) unsigned NOT NULL,
  `prop_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `ordain` smallint(5) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`group_id`,`prop_nick`) USING BTREE,
  CONSTRAINT `FK_shop_cards_shop_groups` FOREIGN KEY (`group_id`) REFERENCES `shop_groups` (`group_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_filters
CREATE TABLE IF NOT EXISTS `shop_filters` (
  `group_id` smallint(6) unsigned NOT NULL,
  `prop_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `ordain` smallint(5) unsigned NOT NULL DEFAULT 0,
  `self_filters` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`group_id`,`prop_nick`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_groups
CREATE TABLE IF NOT EXISTS `shop_groups` (
  `group_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` smallint(5) unsigned DEFAULT NULL,
  `group_title` varchar(127) NOT NULL,
  `group_name` varchar(127) NOT NULL,
  `group_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `ordain` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `self_filters` bit(1) NOT NULL DEFAULT b'0' COMMENT '1 - свои настройки',
  `self_cards` bit(1) NOT NULL DEFAULT b'0' COMMENT '1 - свои настройки',
  `description` text NOT NULL DEFAULT '',
  `image_src` text NOT NULL DEFAULT '',
  PRIMARY KEY (`group_id`) USING BTREE,
  KEY `FK_shop_groups_shop_groups` (`parent_id`),
  CONSTRAINT `FK_shop_groups_shop_groups` FOREIGN KEY (`parent_id`) REFERENCES `shop_groups` (`group_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_itemgroups
CREATE TABLE IF NOT EXISTS `shop_itemgroups` (
  `key_id` int(10) unsigned NOT NULL,
  `group_id` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`key_id`,`group_id`) USING BTREE,
  KEY `FK_sources_items_sources_values` (`key_id`) USING BTREE,
  KEY `FK_shop_items_shop_groups` (`group_id`),
  CONSTRAINT `FK_shop_items_shop_groups` FOREIGN KEY (`group_id`) REFERENCES `shop_groups` (`group_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_shop_items_sources_values` FOREIGN KEY (`key_id`) REFERENCES `sources_values` (`value_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC COMMENT='Для быстрого поиска. Учитываются только позиции, которые не вложенны в подгруппы.';

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_orders
CREATE TABLE IF NOT EXISTS `shop_orders` (
  `order_id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` mediumint(8) unsigned DEFAULT NULL COMMENT 'Пользователь может быть удалён. Заказ останется. Надо сообщить что пользователь удалился. Автор кто непосредственно создал заказ, владельцы указаны в cart_userorders',
  `order_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'Номер из даты с проверкой уникальности',
  `commentuser` text NOT NULL DEFAULT '',
  `commentmanager` text NOT NULL DEFAULT '',
  `email` tinytext NOT NULL DEFAULT '' COMMENT '1. У текущего user_id нет - будет добавлен. 2. У текущего другой, если свободен, то будет добавлен текущему пользователю 3. Для менеджера. Создаётся новый пользователь или заявка привяжется к существующему пользователю. Если телефон у одного, почта у другова заявка привяжется к обоим.',
  `phone` tinytext NOT NULL DEFAULT '' COMMENT '1. У текущего user_id нет - будет добавлен. 2. У текущего другой, если свободен, то будет добавлен текущему пользователю 3. Для менеджера. Создаётся новый пользователь или заявка привяжется к существующему пользователю. Если телефон у одного, почта у другова заявка привяжется к обоим.',
  `name` tinytext NOT NULL DEFAULT '',
  `callback` enum('yes','no') DEFAULT NULL COMMENT 'Перезвонить или нет',
  `status` enum('wait','pay','paid','check','complete','cancel') NOT NULL DEFAULT 'wait' COMMENT 'Доступные статусы',
  `lang` enum('ru','en') DEFAULT NULL COMMENT 'Определёный язык интерфейса посетителя',
  `paid` int(1) unsigned DEFAULT NULL COMMENT 'Метка была ли онлайн оплата',
  `pay` enum('self','card','corp','perevod') DEFAULT NULL,
  `paydata` text DEFAULT NULL COMMENT 'Данные оплаты',
  `city_id` mediumint(9) DEFAULT NULL COMMENT 'Город определённый или изменённый, для сортировки заявок и расчёта стоимости доставки. Может отличаться от выбранного города в заказе',
  `freeze` bit(1) DEFAULT NULL COMMENT 'Метка заморожены ли позиции',
  `partnerjson` text DEFAULT NULL COMMENT 'Данные купона из option.json на момент фриза, если потребуется разбирать откуда такая цена',
  `transport` enum('city','self','cdek_pvz','any','cdek_courier','pochta_simple','pochta_1','pochta_courier') DEFAULT NULL COMMENT 'Выбор пользователя',
  `pvz` text DEFAULT NULL COMMENT 'Адрес в городе',
  `address` text DEFAULT NULL COMMENT 'Адрес в городе',
  `tk` tinytext DEFAULT NULL COMMENT 'Рекомендуемая ТК',
  `zip` text DEFAULT NULL COMMENT 'Индекс',
  `referrer_host` varchar(63) NOT NULL DEFAULT '',
  `source` varchar(63) NOT NULL DEFAULT '',
  `content` varchar(63) NOT NULL DEFAULT '',
  `campaign` varchar(63) NOT NULL DEFAULT '',
  `medium` varchar(63) NOT NULL DEFAULT '',
  `term` varchar(63) NOT NULL DEFAULT '',
  `referrer_host_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
  `source_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
  `content_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
  `campaign_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
  `medium_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
  `term_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '',
  `count` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'Кэш количества позиций(строчек) в корзине. Для сводной таблицы МЕНЕДЖЕРА',
  `sum` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Кэш суммы заказа без стоимости доставки. Для сводной таблицы МЕНЕДЖЕРА',
  `weight` mediumint(8) unsigned NOT NULL DEFAULT 0 COMMENT 'Кэш - расчётный вес',
  `datecreate` datetime DEFAULT NULL COMMENT 'Дата создания заказа, в момент добавления первой позиции',
  `datefreeze` datetime DEFAULT NULL COMMENT 'Дата последней заморозки заказа, если такая была',
  `datecancel` datetime DEFAULT NULL COMMENT 'Дата отмены',
  `datewait` datetime DEFAULT NULL COMMENT 'Дата изменения статуса ожидание, активные заказы в этом статусе',
  `datepay` datetime DEFAULT NULL COMMENT 'Дата изменения статуса ожидает оплаты',
  `datepaid` datetime DEFAULT NULL COMMENT 'Дата подтверждения оплаты',
  `datecheck` datetime DEFAULT NULL COMMENT 'Дата изменения статуса отправлен на проверку',
  `datecomplete` datetime DEFAULT NULL COMMENT 'Дата изменения статуса выполнен',
  `dateemail` datetime DEFAULT NULL COMMENT 'Дата email пользователю',
  `dateedit` datetime DEFAULT NULL COMMENT 'Дата редактирования',
  PRIMARY KEY (`order_id`) USING BTREE,
  KEY `FK_shop_orders_user_users` (`user_id`),
  CONSTRAINT `FK_shop_orders_user_users` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_props
CREATE TABLE IF NOT EXISTS `shop_props` (
  `prop_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `card_tpl` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT 'default' COMMENT 'Считываем из html.js файла возможные значения',
  `filter_tpl` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT 'default' COMMENT 'Считываем из html.js файла возможные значения',
  `singlechoice` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`prop_nick`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for procedure ladasvet.ru.shop_recalcPrev
DELIMITER //
CREATE PROCEDURE `shop_recalcPrev`()
BEGIN 

DECLARE nowYear INT;
DECLARE nowMonth INT;
DECLARE prevYear INT;
DECLARE prevMonth INT;

SELECT YEAR(NOW()), MONTH(NOW()), YEAR(CURRENT_DATE - INTERVAL 1 MONTH), MONTH(CURRENT_DATE - INTERVAL 1 MONTH)
INTO nowYear, nowMonth, prevYear, prevMonth;

INSERT IGNORE INTO shop_stat_groups_brands (
	year, month, group_id, brand_nick, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	prevYear, prevMonth, group_id, brand_nick, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
FROM shop_stat_groups_brands WHERE year = nowYear AND month = nowMonth;

INSERT IGNORE INTO shop_stat_groups_sources (
	year, month, group_id, source_id, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	prevYear, prevMonth, group_id, source_id, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
FROM shop_stat_groups_sources WHERE year = nowYear AND month = nowMonth;

INSERT IGNORE INTO shop_stat_groups (
	year, month, group_id, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	prevYear, prevMonth, group_id, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
FROM shop_stat_groups WHERE year = nowYear AND month = nowMonth;


INSERT IGNORE INTO shop_stat (
	year, month, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	prevYear, prevMonth, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
FROM shop_stat WHERE year = nowYear AND month = nowMonth;

INSERT IGNORE INTO shop_stat_brands (
	year, month, brand_nick, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	prevYear, prevMonth, brand_nick, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
FROM shop_stat_brands WHERE year = nowYear AND month = nowMonth;

INSERT IGNORE INTO shop_stat_sources (
	year, month, source_id, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	prevYear, prevMonth, source_id, 
	groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
FROM shop_stat_sources WHERE year = nowYear AND month = nowMonth;

END//
DELIMITER ;

-- Dumping structure for procedure ladasvet.ru.shop_recalcStat
DELIMITER //
CREATE PROCEDURE `shop_recalcStat`()
BEGIN 


DECLARE brendart_prop_id INT;
DECLARE brendmodel_prop_id INT;
DECLARE brend_prop_id INT;
DECLARE cena_prop_id INT;
DECLARE name_prop_id INT;
DECLARE img_prop_id INT;
DECLARE descr_prop_id INT;

DECLARE nowYear INT;
DECLARE nowMonth INT;
DECLARE prevYear INT;
DECLARE prevMonth INT;

DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
	DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_orders;
	DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_keymbs;
	DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_upgroups;
	DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_filters;
	DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_keysources;
	RESIGNAL;
END;

SET nowYear = YEAR(NOW());
SET nowMonth = MONTH(NOW());

-- DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_orders;
-- DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_keymbs;
-- DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_upgroups;
-- DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_filters;
-- DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_keysources;


SELECT YEAR(CURRENT_DATE - INTERVAL 1 MONTH), MONTH(CURRENT_DATE - INTERVAL 1 MONTH)
INTO prevYear, prevMonth;

SELECT prop_id INTO brendart_prop_id FROM sources_wprops WHERE prop_nick = "brendart";
SELECT prop_id INTO brendmodel_prop_id FROM sources_wprops WHERE prop_nick = "brendmodel";
SELECT prop_id INTO brend_prop_id FROM sources_wprops WHERE prop_nick = "brend";
SELECT prop_id INTO cena_prop_id FROM sources_wprops WHERE prop_nick = "cena";
SELECT prop_id INTO name_prop_id FROM sources_wprops WHERE prop_nick = "naimenovanie";
SELECT prop_id INTO img_prop_id FROM sources_wprops WHERE prop_nick = "images";
SELECT prop_id INTO descr_prop_id FROM sources_wprops WHERE prop_nick = "opisanie";



CREATE TEMPORARY TABLE IF NOT EXISTS shop_stat_temp_upgroups AS
WITH RECURSIVE upgroups AS (
    -- Якорная часть: начальная группа
    SELECT 
        group_id as group_id,
        group_name AS group_path,
        group_id AS up_group_id,
        self_filters AS up_self_filters,
        parent_id AS up_parent_id,
        0 as up_distance
    FROM shop_groups 
    
    UNION ALL
    
    -- Рекурсивная часть: идем вверх по иерархии
    SELECT 
    		gh.group_id,
    		CONCAT(g.group_name, ' -> ', gh.group_path),
			g.group_id,
			g.self_filters,
			g.parent_id,
			gh.up_distance + 1
        
    FROM shop_groups g
    INNER JOIN upgroups gh ON g.group_id = gh.up_parent_id
) SELECT * FROM upgroups;


CREATE TEMPORARY TABLE IF NOT EXISTS shop_stat_temp_filters 
(INDEX idx (group_id, up_filter_prop_id)) AS ( 
-- child-id дай ближайшие фильтры, которые up_group_id, prop_id
	SELECT 
		h.group_id,
		h.group_path, 
		h.up_distance, 
		h.up_group_id, 
		p.prop_id AS up_filter_prop_id
	FROM shop_stat_temp_upgroups h, shop_filters f, sources_wprops p
	WHERE up_distance = (  -- забираем только тот левел где есть up_self_filters иначе не забираем
	    SELECT MIN(h2.up_distance)
	    FROM shop_stat_temp_upgroups h2
	    WHERE h2.group_id = h.group_id AND h2.up_self_filters = 1
	)
	AND f.group_id = h.up_group_id
	AND p.prop_nick = f.prop_nick
);


CREATE TEMPORARY TABLE IF NOT EXISTS shop_stat_temp_orders AS (
	SELECT o.order_id, va.value_id AS key_id, o.status
	FROM shop_orders o, shop_basket b, sources_values va
	WHERE YEAR(o.dateedit) = nowYear AND MONTH(o.dateedit) = nowMonth
	AND b.order_id = o.order_id
	AND va.value_nick = b.brendart_nick
);


CREATE TEMPORARY TABLE IF NOT EXISTS shop_stat_temp_keysources
(INDEX idx (key_id, source_id)) AS (
	SELECT DISTINCT
		wce.source_id,
		wce.key_id,
		wce.entity_id
	FROM
		sources_wcells wce
	WHERE wce.entity_id = brendart_prop_id
);



CREATE TEMPORARY TABLE IF NOT EXISTS shop_stat_temp_keymbs 
(INDEX key_group_source_brand (key_id, model_id, brand_id)) AS
WITH key_ids AS (
	SELECT DISTINCT
		wce.key_id,
		wce.entity_id
	FROM
		sources_wcells wce
	WHERE wce.entity_id = brendart_prop_id
) 
SELECT
	k.key_id,
	k.entity_id,
	bm.value_id AS model_id,
	br.value_id AS brand_id,
	if(ce.key_id IS NULL, 0, ce.source_id) AS cena_source_id,
	if(na.key_id IS NULL, 0, 1) AS isname,
	if(br.key_id IS NULL, 0, 1) AS isbrand,
	if(im.key_id IS NULL, 0, 1) AS isimg,
	if(de.key_id IS NULL, 0, 1) AS isdescr
FROM
key_ids k
	LEFT JOIN sources_wvalues bm ON (bm.entity_id = k.entity_id AND k.key_id = bm.key_id AND bm.prop_id = brendmodel_prop_id)
	LEFT JOIN sources_wvalues br ON (br.entity_id = k.entity_id AND k.key_id = br.key_id AND br.prop_id = brend_prop_id)
	LEFT JOIN sources_wcells ce ON (ce.entity_id = k.entity_id AND k.key_id = ce.key_id AND ce.prop_id = cena_prop_id)
	LEFT JOIN sources_wcells na ON (na.entity_id = k.entity_id AND na.key_id = k.key_id AND na.prop_id = name_prop_id)
	LEFT JOIN sources_wcells im ON (im.entity_id = k.entity_id AND im.key_id = k.key_id AND im.prop_id = img_prop_id)
	LEFT JOIN sources_wcells de ON (de.entity_id = k.entity_id AND de.key_id = k.key_id AND de.prop_id = descr_prop_id);




UPDATE shop_stat 
SET poscount = 0, modcount = 0, 
	filtercount = 0, brandcount = 0, withfilters = 0, withcost = 0, withbrands = 0, withimg = 0, withdescr = 0,
	withname = 0, withall = 0, sourcecount = 0, date_cost = 0, basketcount = 0, ordercount = 0
WHERE year = nowYear AND month = nowMonth;
REPLACE INTO shop_stat (
	year, month, groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	nowYear,
	nowMonth,
	COUNT(DISTINCT ig.group_id) AS groupcount,
	COUNT(DISTINCT k.key_id) AS poscount,
	COUNT(DISTINCT k.model_id) AS modcount,
	COUNT(DISTINCT f.up_filter_prop_id) AS filtercount,
	COUNT(DISTINCT k.brand_id) AS brandcount,
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
		THEN k.key_id END
	) AS withfilters,
	
	COUNT(DISTINCT CASE WHEN k.cena_source_id THEN k.key_id END) as withcost,	
	COUNT(DISTINCT CASE WHEN k.isbrand THEN k.key_id END) as withbrands,	
	COUNT(DISTINCT CASE WHEN k.isimg THEN k.key_id END) as withimg,
	COUNT(DISTINCT CASE WHEN k.isdescr THEN k.key_id END) as withdescr,
	COUNT(DISTINCT CASE WHEN k.isname THEN k.key_id END) as withname,
	
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
			OR NOT k.cena_source_id
			OR NOT k.isbrand
			OR NOT k.isimg
         OR NOT k.isdescr 
         OR NOT k.isname 
		THEN k.key_id END
	) AS withall,
	(
		SELECT COUNT(DISTINCT s.source_id)
		FROM shop_stat_temp_keysources s
	) AS sourcecount,
--	COUNT(DISTINCT s.source_id) AS sourcecount,
	min(cenaso.date_content) as date_cost,
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM shop_stat_temp_orders o
	) AS basketcount,
-- COUNT(DISTINCT o.order_id) AS basketcount
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM shop_stat_temp_orders o
		WHERE o.status != 'wait'
	) AS ordercount
--	COUNT(DISTINCT CASE WHEN o.status != 'wait' THEN o.order_id END) as ordercount,

FROM shop_stat_temp_keymbs k
-- LEFT JOIN shop_stat_temp_orders o ON (o.key_id = k.key_id
--	LEFT JOIN shop_stat_temp_keysources s ON (s.key_id = k.key_id)
	LEFT JOIN sources_values va ON va.value_id = k.brand_id
 	LEFT JOIN sources_sources cenaso ON (cenaso.source_id = k.cena_source_id)
	LEFT join shop_allitemgroups ig ON (ig.key_id = k.key_id)
		left join shop_stat_temp_filters f ON (f.group_id = ig.group_id)
	LEFT JOIN sources_wcells wce ON (wce.key_id = k.key_id and wce.prop_id = f.up_filter_prop_id AND wce.entity_id = k.entity_id);



UPDATE shop_stat_groups 
SET poscount = 0, modcount = 0, 
	filtercount = 0, brandcount = 0, withfilters = 0, withcost = 0, withbrands = 0, withimg = 0, withdescr = 0,
	withname = 0, withall = 0, sourcecount = 0, date_cost = 0, basketcount = 0, ordercount = 0
WHERE year = nowYear AND month = nowMonth;
REPLACE INTO shop_stat_groups (
	year, month, group_id, groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	nowYear,
	nowMonth,
	ig.group_id, 
	(SELECT COUNT(*) FROM shop_stat_temp_upgroups h WHERE h.up_group_id = ig.group_id) AS groupcount,
	COUNT(DISTINCT k.key_id) AS poscount,
	COUNT(DISTINCT k.model_id) AS modcount,
	COUNT(DISTINCT f.up_filter_prop_id) AS filtercount,
	COUNT(DISTINCT k.brand_id) AS brandcount,
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
		THEN k.key_id END
	) AS withfilters,
	
	COUNT(DISTINCT CASE WHEN k.cena_source_id THEN k.key_id END) as withcost,	
	COUNT(DISTINCT CASE WHEN k.isbrand THEN k.key_id END) as withbrands,	
	COUNT(DISTINCT CASE WHEN k.isimg THEN k.key_id END) as withimg,
	COUNT(DISTINCT CASE WHEN k.isdescr THEN k.key_id END) as withdescr,
	COUNT(DISTINCT CASE WHEN k.isname THEN k.key_id END) as withname,
	
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
			OR NOT k.cena_source_id
			OR NOT k.isbrand
			OR NOT k.isimg
         OR NOT k.isdescr 
         OR NOT k.isname 
		THEN k.key_id END
	) AS withall,
	(
		SELECT COUNT(DISTINCT kso.source_id)
		FROM 
			shop_stat_temp_keysources kso,
			shop_allitemgroups igr
		WHERE igr.key_id = kso.key_id AND igr.group_id = ig.group_id
	) AS sourcecount,
--	COUNT(DISTINCT s.source_id) AS sourcecount,
	min(cenaso.date_content) as date_cost,
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM 
			shop_stat_temp_orders o,
			shop_allitemgroups igr
		WHERE igr.key_id = o.key_id AND igr.group_id = ig.group_id
	) AS basketcount,
-- COUNT(DISTINCT o.order_id) AS basketcount
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM 
			shop_stat_temp_orders o,
			shop_allitemgroups igr
		WHERE igr.key_id = o.key_id AND igr.group_id = ig.group_id AND o.status != 'wait'
	) AS ordercount
--	COUNT(DISTINCT CASE WHEN o.status != 'wait' THEN o.order_id END) as ordercount,

FROM shop_stat_temp_keymbs k
-- LEFT JOIN shop_stat_temp_orders o ON (o.key_id = k.key_id
--	LEFT JOIN shop_stat_temp_keysources s ON (s.key_id = k.key_id)
 	LEFT JOIN sources_sources cenaso ON (cenaso.source_id = k.cena_source_id)
	INNER join shop_allitemgroups ig ON (ig.key_id = k.key_id)
		left join shop_stat_temp_filters f ON (f.group_id = ig.group_id)
	LEFT JOIN sources_wcells wce ON (wce.key_id = k.key_id and wce.prop_id = f.up_filter_prop_id AND wce.entity_id = k.entity_id)
GROUP BY ig.group_id;


UPDATE shop_stat_brands 
SET poscount = 0, modcount = 0, 
	filtercount = 0, brandcount = 0, withfilters = 0, withcost = 0, withbrands = 0, withimg = 0, withdescr = 0,
	withname = 0, withall = 0, sourcecount = 0, date_cost = 0, basketcount = 0, ordercount = 0
WHERE year = nowYear AND month = nowMonth;
REPLACE INTO shop_stat_brands (
	year, month, brand_nick, groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	nowYear,
	nowMonth,
	va.value_nick as brand_nick, 
	COUNT(DISTINCT ig.group_id) AS groupcount,
	COUNT(DISTINCT k.key_id) AS poscount,
	COUNT(DISTINCT k.model_id) AS modcount,
	COUNT(DISTINCT f.up_filter_prop_id) AS filtercount,
		
	(
		SELECT COUNT(DISTINCT kek2.brand_id)
		FROM 
			shop_stat_temp_keymbs kek, 
			shop_stat_temp_keymbs kek2
		WHERE 
			kek.brand_id = k.brand_id 
			AND kek2.key_id = kek.key_id -- позиций выбранного бренда
	) AS brandcount,
	
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
		THEN k.key_id END
	) AS withfilters,
	
	COUNT(DISTINCT CASE WHEN k.cena_source_id THEN k.key_id END) as withcost,	
	COUNT(DISTINCT CASE WHEN k.isbrand THEN k.key_id END) as withbrands,	
	COUNT(DISTINCT CASE WHEN k.isimg THEN k.key_id END) as withimg,
	COUNT(DISTINCT CASE WHEN k.isdescr THEN k.key_id END) as withdescr,
	COUNT(DISTINCT CASE WHEN k.isname THEN k.key_id END) as withname,
	
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
			OR NOT k.cena_source_id
			OR NOT k.isbrand
			OR NOT k.isimg
         OR NOT k.isdescr 
         OR NOT k.isname 
		THEN k.key_id END
	) AS withall,
	(
		SELECT COUNT(DISTINCT s.source_id)
		FROM 
			shop_stat_temp_keysources s,
			shop_stat_temp_keymbs kk
		WHERE kk.key_id = s.key_id AND kk.brand_id = k.brand_id
	) AS sourcecount,
--	COUNT(DISTINCT s.source_id) AS sourcecount,
	min(cenaso.date_content) as date_cost,
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM 
			shop_stat_temp_orders o,
			shop_stat_temp_keymbs kk
		WHERE kk.key_id = o.key_id AND kk.brand_id = k.brand_id
	) AS basketcount,
-- COUNT(DISTINCT o.order_id) AS basketcount
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM 
			shop_stat_temp_orders o,
			shop_stat_temp_keymbs kk
		WHERE kk.key_id = o.key_id AND kk.brand_id = k.brand_id AND o.status != 'wait'
	) AS ordercount
--	COUNT(DISTINCT CASE WHEN o.status != 'wait' THEN o.order_id END) as ordercount,

FROM shop_stat_temp_keymbs k
-- LEFT JOIN shop_stat_temp_orders o ON (o.key_id = k.key_id
--	LEFT JOIN shop_stat_temp_keysources s ON (s.key_id = k.key_id)
	INNER JOIN sources_values va ON va.value_id = k.brand_id
 	LEFT JOIN sources_sources cenaso ON (cenaso.source_id = k.cena_source_id)
	LEFT join shop_allitemgroups ig ON (ig.key_id = k.key_id)
		left join shop_stat_temp_filters f ON (f.group_id = ig.group_id)
	LEFT JOIN sources_wcells wce ON (wce.key_id = k.key_id and wce.prop_id = f.up_filter_prop_id AND wce.entity_id = k.entity_id)
GROUP BY k.brand_id;

UPDATE shop_stat_sources 
SET poscount = 0, modcount = 0, 
	filtercount = 0, brandcount = 0, withfilters = 0, withcost = 0, withbrands = 0, withimg = 0, withdescr = 0,
	withname = 0, withall = 0, sourcecount = 0, date_cost = 0, basketcount = 0, ordercount = 0
WHERE year = nowYear AND month = nowMonth;
REPLACE INTO shop_stat_sources (
	year, month, source_id, groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	nowYear,
	nowMonth,
	s.source_id, 
	COUNT(DISTINCT ig.group_id) AS groupcount,
	COUNT(DISTINCT k.key_id) AS poscount,
	COUNT(DISTINCT k.model_id) AS modcount,
	COUNT(DISTINCT f.up_filter_prop_id) AS filtercount,
	COUNT(DISTINCT k.brand_id) AS brandcount,
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
		THEN k.key_id END
	) AS withfilters,
	
	COUNT(DISTINCT CASE WHEN k.cena_source_id THEN k.key_id END) as withcost,	
	COUNT(DISTINCT CASE WHEN k.isbrand THEN k.key_id END) as withbrands,	
	COUNT(DISTINCT CASE WHEN k.isimg THEN k.key_id END) as withimg,
	COUNT(DISTINCT CASE WHEN k.isdescr THEN k.key_id END) as withdescr,
	COUNT(DISTINCT CASE WHEN k.isname THEN k.key_id END) as withname,
	
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
			OR NOT k.cena_source_id
			OR NOT k.isbrand
			OR NOT k.isimg
         OR NOT k.isdescr 
         OR NOT k.isname 
		THEN k.key_id END
	) AS withall,
	(
		SELECT COUNT(DISTINCT s.source_id)
		FROM 
			shop_stat_temp_keysources s,
			shop_stat_temp_keysources kk
		WHERE kk.key_id = s.key_id AND kk.source_id = s.source_id
	) AS sourcecount,
--	COUNT(DISTINCT s.source_id) AS sourcecount,
	min(cenaso.date_content) as date_cost,
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM 
			shop_stat_temp_orders o,
			shop_stat_temp_keysources kk
		WHERE kk.key_id = o.key_id AND kk.source_id = s.source_id
	) AS basketcount,
-- COUNT(DISTINCT o.order_id) AS basketcount
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM 
			shop_stat_temp_orders o,
			shop_stat_temp_keysources kk
		WHERE kk.key_id = o.key_id AND kk.source_id = s.source_id AND o.status != 'wait'
	) AS ordercount
--	COUNT(DISTINCT CASE WHEN o.status != 'wait' THEN o.order_id END) as ordercount,

FROM shop_stat_temp_keymbs k
-- LEFT JOIN shop_stat_temp_orders o ON (o.key_id = k.key_id
	LEFT JOIN shop_stat_temp_keysources s ON (s.key_id = k.key_id)
	LEFT JOIN sources_values va ON va.value_id = k.brand_id
 	LEFT JOIN sources_sources cenaso ON (cenaso.source_id = k.cena_source_id)
	LEFT join shop_allitemgroups ig ON (ig.key_id = k.key_id)
		left join shop_stat_temp_filters f ON (f.group_id = ig.group_id)
	LEFT JOIN sources_wcells wce ON (wce.key_id = k.key_id and wce.prop_id = f.up_filter_prop_id AND wce.entity_id = k.entity_id)
GROUP BY s.source_id;


UPDATE shop_stat_groups_sources 
SET poscount = 0, modcount = 0, 
	filtercount = 0, brandcount = 0, withfilters = 0, withcost = 0, withbrands = 0, withimg = 0, withdescr = 0,
	withname = 0, withall = 0, sourcecount = 0, date_cost = 0, basketcount = 0, ordercount = 0
WHERE year = nowYear AND month = nowMonth;
REPLACE INTO shop_stat_groups_sources (
 	year, month, group_id, source_id, groupcount, poscount, modcount, 
 	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
 	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	nowYear,
	nowMonth,
	ig.group_id,
	s.source_id, 
	(
		SELECT COUNT(DISTINCT igr.group_id)
		FROM 
			shop_stat_temp_keysources sok,
			shop_allitemgroups igr,
			shop_stat_temp_upgroups upg
		WHERE sok.source_id = s.source_id
		AND sok.key_id = igr.key_id
		AND igr.group_id = upg.group_id
		AND upg.up_group_id = ig.group_id 

	) AS groupcount,
	COUNT(DISTINCT k.key_id) AS poscount,
	COUNT(DISTINCT k.model_id) AS modcount,
	COUNT(DISTINCT f.up_filter_prop_id) AS filtercount,
	COUNT(DISTINCT k.brand_id) AS brandcount,
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
		THEN k.key_id END
	) AS withfilters,
	
	COUNT(DISTINCT CASE WHEN k.cena_source_id THEN k.key_id END) as withcost,	
	COUNT(DISTINCT CASE WHEN k.isbrand THEN k.key_id END) as withbrands,	
	COUNT(DISTINCT CASE WHEN k.isimg THEN k.key_id END) as withimg,
	COUNT(DISTINCT CASE WHEN k.isdescr THEN k.key_id END) as withdescr,
	COUNT(DISTINCT CASE WHEN k.isname THEN k.key_id END) as withname,
	
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
			OR NOT k.cena_source_id
			OR NOT k.isbrand
			OR NOT k.isimg
         OR NOT k.isdescr 
         OR NOT k.isname 
		THEN k.key_id END
	) AS withall,
	(
		SELECT COUNT(DISTINCT s.source_id)
		FROM 
			shop_stat_temp_keysources s,
			shop_stat_temp_keysources kk
		WHERE kk.key_id = s.key_id AND kk.source_id = s.source_id
	) AS sourcecount,
--	COUNT(DISTINCT s.source_id) AS sourcecount,
	min(cenaso.date_content) as date_cost,
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM 
			shop_stat_temp_orders o,
			shop_stat_temp_keysources kk
		WHERE kk.key_id = o.key_id AND kk.source_id = s.source_id
	) AS basketcount,
-- COUNT(DISTINCT o.order_id) AS basketcount
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM 
			shop_stat_temp_orders o,
			shop_stat_temp_keysources kk
		WHERE kk.key_id = o.key_id AND kk.source_id = s.source_id AND o.status != 'wait'
	) AS ordercount
--	COUNT(DISTINCT CASE WHEN o.status != 'wait' THEN o.order_id END) as ordercount,

FROM shop_stat_temp_keymbs k
-- LEFT JOIN shop_stat_temp_orders o ON (o.key_id = k.key_id
	LEFT JOIN shop_stat_temp_keysources s ON (s.key_id = k.key_id)
	LEFT JOIN sources_values va ON va.value_id = k.brand_id
 	LEFT JOIN sources_sources cenaso ON (cenaso.source_id = k.cena_source_id)
	INNER join shop_allitemgroups ig ON (ig.key_id = k.key_id)
		left join shop_stat_temp_filters f ON (f.group_id = ig.group_id)
	LEFT JOIN sources_wcells wce ON (wce.key_id = k.key_id and wce.prop_id = f.up_filter_prop_id AND wce.entity_id = k.entity_id)
GROUP BY ig.group_id, s.source_id;



UPDATE shop_stat_groups_brands 
SET poscount = 0, modcount = 0, 
	filtercount = 0, brandcount = 0, withfilters = 0, withcost = 0, withbrands = 0, withimg = 0, withdescr = 0,
	withname = 0, withall = 0, sourcecount = 0, date_cost = 0, basketcount = 0, ordercount = 0
WHERE year = nowYear AND month = nowMonth;
REPLACE INTO shop_stat_groups_brands (
	year, month, group_id, brand_nick, groupcount, poscount, modcount, 
	filtercount, brandcount, withfilters, withcost, withbrands, withimg, withdescr,
	withname, withall, sourcecount, date_cost, basketcount, ordercount
)
SELECT 
	nowYear,
	nowMonth,
	ig.group_id,
	va.value_nick as brand_nick, 
	(
		SELECT COUNT(DISTINCT igr.group_id)
		FROM 
			shop_stat_temp_keymbs bok,
			shop_allitemgroups igr,
			shop_stat_temp_upgroups upg
		WHERE bok.brand_id = k.brand_id
		AND bok.key_id = igr.key_id
		AND igr.group_id = upg.group_id
		AND upg.up_group_id = ig.group_id 

	) AS groupcount,
	COUNT(DISTINCT k.key_id) AS poscount,
	COUNT(DISTINCT k.model_id) AS modcount,
	COUNT(DISTINCT f.up_filter_prop_id) AS filtercount,
	
	(
		SELECT COUNT(DISTINCT kek2.brand_id)
		FROM 
			shop_stat_temp_keymbs kek, 
			shop_stat_temp_keymbs kek2,
			shop_allitemgroups igr
		WHERE 
			igr.group_id = ig.group_id
			AND kek.brand_id = k.brand_id 
			
			AND kek2.key_id = igr.key_id -- в выбранной группе
			AND kek2.key_id = kek.key_id -- позиций выбранного бренда
			
	) AS brandcount,
	
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
		THEN k.key_id END
	) AS withfilters,
	
	COUNT(DISTINCT CASE WHEN k.cena_source_id THEN k.key_id END) as withcost,	
	COUNT(DISTINCT CASE WHEN k.isbrand THEN k.key_id END) as withbrands,	
	COUNT(DISTINCT CASE WHEN k.isimg THEN k.key_id END) as withimg,
	COUNT(DISTINCT CASE WHEN k.isdescr THEN k.key_id END) as withdescr,
	COUNT(DISTINCT CASE WHEN k.isname THEN k.key_id END) as withname,
	
	COUNT(DISTINCT k.key_id) - COUNT(
		DISTINCT 
		CASE WHEN 
			wce.prop_id IS NULL
			OR NOT k.cena_source_id
			OR NOT k.isbrand
			OR NOT k.isimg
         OR NOT k.isdescr 
         OR NOT k.isname 
		THEN k.key_id END
	) AS withall,
	(
		SELECT COUNT(DISTINCT s.source_id)
		FROM 
			shop_stat_temp_keysources s,
			shop_stat_temp_keymbs kk
		WHERE kk.key_id = s.key_id AND kk.brand_id = k.brand_id
	) AS sourcecount,
--	COUNT(DISTINCT s.source_id) AS sourcecount,
	min(cenaso.date_content) as date_cost,
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM 
			shop_stat_temp_orders o,
			shop_stat_temp_keymbs kk
		WHERE kk.key_id = o.key_id AND kk.brand_id = k.brand_id
	) AS basketcount,
-- COUNT(DISTINCT o.order_id) AS basketcount
	(
		SELECT COUNT(DISTINCT o.order_id)
		FROM 
			shop_stat_temp_orders o,
			shop_stat_temp_keymbs kk
		WHERE kk.key_id = o.key_id AND kk.brand_id = k.brand_id AND o.status != 'wait'
	) AS ordercount
--	COUNT(DISTINCT CASE WHEN o.status != 'wait' THEN o.order_id END) as ordercount,

FROM shop_stat_temp_keymbs k
-- LEFT JOIN shop_stat_temp_orders o ON (o.key_id = k.key_id
--	LEFT JOIN shop_stat_temp_keysources s ON (s.key_id = k.key_id)
	INNER JOIN sources_values va ON va.value_id = k.brand_id
 	LEFT JOIN sources_sources cenaso ON (cenaso.source_id = k.cena_source_id)
	INNER join shop_allitemgroups ig ON (ig.key_id = k.key_id)
		left join shop_stat_temp_filters f ON (f.group_id = ig.group_id)
			LEFT JOIN sources_wcells wce ON (wce.key_id = k.key_id and wce.prop_id = f.up_filter_prop_id AND wce.entity_id = k.entity_id)
GROUP BY ig.group_id, k.brand_id;


CALL shop_recalcPrev();


DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_keysources;
DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_orders;
DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_keymbs;
DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_upgroups;
DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_filters;
END//
DELIMITER ;

-- Dumping structure for table ladasvet.ru.shop_sampleprops
CREATE TABLE IF NOT EXISTS `shop_sampleprops` (
  `sample_id` smallint(5) unsigned NOT NULL,
  `prop_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `date_create` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Для сортировки',
  `spec` enum('empty','any','exactly') NOT NULL DEFAULT 'exactly',
  PRIMARY KEY (`sample_id`,`prop_nick`) USING BTREE,
  CONSTRAINT `FK_shop_sampleprops_shop_samples` FOREIGN KEY (`sample_id`) REFERENCES `shop_samples` (`sample_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_samples
CREATE TABLE IF NOT EXISTS `shop_samples` (
  `sample_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `group_id` smallint(5) unsigned NOT NULL,
  `date_create` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Для сортировки',
  PRIMARY KEY (`sample_id`,`group_id`) USING BTREE,
  KEY `FK_shop_gsamples_shop_groups` (`group_id`),
  CONSTRAINT `FK_shop_gsamples_shop_groups` FOREIGN KEY (`group_id`) REFERENCES `shop_groups` (`group_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_samplevalues
CREATE TABLE IF NOT EXISTS `shop_samplevalues` (
  `sample_id` smallint(5) unsigned NOT NULL,
  `prop_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `value_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `date_create` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Для сортировки',
  `number` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`sample_id`,`prop_nick`,`value_nick`) USING BTREE,
  CONSTRAINT `FK_shop_samplepropvalues_shop_samples` FOREIGN KEY (`sample_id`) REFERENCES `shop_samples` (`sample_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_shop_samplevalues_shop_sampleprops` FOREIGN KEY (`sample_id`, `prop_nick`) REFERENCES `shop_sampleprops` (`sample_id`, `prop_nick`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_stat
CREATE TABLE IF NOT EXISTS `shop_stat` (
  `year` smallint(5) unsigned NOT NULL,
  `month` enum('1','2','3','4','5','6','7','8','9','10','11','12') CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `poscount` mediumint(8) unsigned NOT NULL COMMENT 'Позиций всего',
  `modcount` mediumint(8) unsigned NOT NULL COMMENT 'Моделей всего',
  `groupcount` smallint(5) unsigned NOT NULL COMMENT 'Групп на 1 уровне',
  `brandcount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, брендов',
  `filtercount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, свойств в фильтрах',
  `sourcecount` smallint(5) unsigned NOT NULL COMMENT 'Истончиков',
  `basketcount` mediumint(8) unsigned NOT NULL COMMENT 'Всего заказов с товарами этого сегмента',
  `ordercount` mediumint(8) unsigned NOT NULL COMMENT 'Заказов отправленных на проверку с товарами этого сегмента',
  `date_cost` datetime DEFAULT NULL COMMENT 'Актуальность',
  `withfilters` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть все фильтры для всех групп в которые эти позиции попадают',
  `withbrands` mediumint(8) unsigned NOT NULL,
  `withcost` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть цена',
  `withimg` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть картинка',
  `withdescr` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть описание',
  `withname` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть наименование',
  `withall` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть всё',
  `date_restat` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`year`,`month`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_stat_brands
CREATE TABLE IF NOT EXISTS `shop_stat_brands` (
  `year` smallint(5) unsigned NOT NULL,
  `month` enum('1','2','3','4','5','6','7','8','9','10','11','12') CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `brand_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `poscount` mediumint(8) unsigned NOT NULL COMMENT 'Позиций всего',
  `modcount` mediumint(8) unsigned NOT NULL COMMENT 'Моделей всего',
  `groupcount` smallint(5) unsigned NOT NULL COMMENT 'Групп',
  `brandcount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, брендов',
  `filtercount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, свойств в фильтрах',
  `sourcecount` smallint(5) unsigned NOT NULL,
  `basketcount` mediumint(8) unsigned NOT NULL COMMENT 'Всего заказов с товарами этого сегмента',
  `ordercount` mediumint(8) unsigned NOT NULL COMMENT 'Заказов отправленных на проверку с товарами этого сегмента',
  `date_cost` datetime DEFAULT NULL COMMENT 'Актуальность',
  `withfilters` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть все фильтры для всех групп в которые эти позиции попадают',
  `withbrands` mediumint(8) unsigned NOT NULL,
  `withcost` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть цена',
  `withimg` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть картинка',
  `withdescr` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть описание',
  `withname` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть наименование',
  `withall` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть всё',
  PRIMARY KEY (`year`,`month`,`brand_nick`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_stat_groups
CREATE TABLE IF NOT EXISTS `shop_stat_groups` (
  `year` smallint(5) unsigned NOT NULL,
  `month` enum('1','2','3','4','5','6','7','8','9','10','11','12') CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `group_id` smallint(5) unsigned NOT NULL,
  `poscount` mediumint(8) unsigned NOT NULL COMMENT 'Позиций всего',
  `modcount` mediumint(8) unsigned NOT NULL COMMENT 'Моделей всего',
  `groupcount` smallint(5) unsigned NOT NULL COMMENT 'Групп на 1 уровне',
  `brandcount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, брендов',
  `filtercount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, свойств в фильтрах',
  `sourcecount` smallint(5) unsigned NOT NULL,
  `basketcount` mediumint(8) unsigned NOT NULL COMMENT 'Всего заказов с товарами этого сегмента',
  `ordercount` mediumint(8) unsigned NOT NULL COMMENT 'Заказов отправленных на проверку с товарами этого сегмента',
  `date_cost` datetime DEFAULT NULL COMMENT 'Актуальность',
  `withfilters` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть все фильтры для всех групп в которые эти позиции попадают',
  `withbrands` mediumint(8) unsigned NOT NULL,
  `withcost` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть цена',
  `withimg` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть картинка',
  `withdescr` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть описание',
  `withname` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть наименование',
  `withall` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть всё',
  PRIMARY KEY (`year`,`month`,`group_id`) USING BTREE,
  KEY `FK_shop_stat_shop_groups` (`group_id`) USING BTREE,
  CONSTRAINT `shop_stat_groups_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `shop_groups` (`group_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_stat_groups_brands
CREATE TABLE IF NOT EXISTS `shop_stat_groups_brands` (
  `year` smallint(5) unsigned NOT NULL,
  `month` enum('1','2','3','4','5','6','7','8','9','10','11','12') CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `group_id` smallint(5) unsigned NOT NULL,
  `brand_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `poscount` mediumint(8) unsigned NOT NULL COMMENT 'Позиций всего',
  `modcount` mediumint(8) unsigned NOT NULL COMMENT 'Моделей всего',
  `groupcount` smallint(5) unsigned NOT NULL COMMENT 'Групп на 1 уровне',
  `brandcount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, брендов',
  `filtercount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, свойств в фильтрах',
  `sourcecount` smallint(5) unsigned NOT NULL,
  `basketcount` mediumint(8) unsigned NOT NULL COMMENT 'Всего заказов с товарами этого сегмента',
  `ordercount` mediumint(8) unsigned NOT NULL COMMENT 'Заказов отправленных на проверку с товарами этого сегмента',
  `date_cost` datetime DEFAULT NULL COMMENT 'Актуальность',
  `withfilters` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть все фильтры для всех групп в которые эти позиции попадают',
  `withbrands` mediumint(8) unsigned NOT NULL,
  `withcost` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть цена',
  `withimg` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть картинка',
  `withdescr` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть описание',
  `withname` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть наименование',
  `withall` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть всё',
  PRIMARY KEY (`year`,`month`,`group_id`,`brand_nick`) USING BTREE,
  KEY `FK_shop_stat_shop_groups` (`group_id`) USING BTREE,
  CONSTRAINT `shop_stat_groups_brands_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `shop_groups` (`group_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_stat_groups_sources
CREATE TABLE IF NOT EXISTS `shop_stat_groups_sources` (
  `year` smallint(5) unsigned NOT NULL,
  `month` enum('1','2','3','4','5','6','7','8','9','10','11','12') CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `group_id` smallint(5) unsigned NOT NULL,
  `source_id` smallint(5) unsigned NOT NULL,
  `poscount` mediumint(8) unsigned NOT NULL COMMENT 'Позиций всего',
  `modcount` mediumint(8) unsigned NOT NULL COMMENT 'Моделей всего',
  `groupcount` smallint(5) unsigned NOT NULL COMMENT 'Групп на 1 уровне',
  `brandcount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, брендов',
  `filtercount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, свойств в фильтрах',
  `sourcecount` smallint(5) unsigned NOT NULL,
  `basketcount` mediumint(8) unsigned NOT NULL COMMENT 'Всего заказов с товарами этого сегмента',
  `ordercount` mediumint(8) unsigned NOT NULL COMMENT 'Заказов отправленных на проверку с товарами этого сегмента',
  `date_cost` datetime DEFAULT NULL COMMENT 'Актуальность',
  `withfilters` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть все фильтры для всех групп в которые эти позиции попадают',
  `withbrands` mediumint(8) unsigned NOT NULL,
  `withcost` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть цена',
  `withimg` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть картинка',
  `withdescr` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть описание',
  `withname` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть наименование',
  `withall` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть всё',
  PRIMARY KEY (`year`,`month`,`group_id`,`source_id`) USING BTREE,
  KEY `FK_shop_stat_shop_groups` (`group_id`) USING BTREE,
  KEY `FK_shop_stat_groups_sources_sources_sources` (`source_id`),
  CONSTRAINT `FK_shop_stat_groups_sources_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `shop_stat_groups_sources_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `shop_groups` (`group_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_stat_sources
CREATE TABLE IF NOT EXISTS `shop_stat_sources` (
  `year` smallint(5) unsigned NOT NULL,
  `month` enum('1','2','3','4','5','6','7','8','9','10','11','12') CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `source_id` smallint(5) unsigned NOT NULL,
  `poscount` mediumint(8) unsigned NOT NULL COMMENT 'Позиций всего',
  `modcount` mediumint(8) unsigned NOT NULL COMMENT 'Моделей всего',
  `groupcount` smallint(5) unsigned NOT NULL COMMENT 'Групп на 1 уровне',
  `brandcount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, брендов',
  `filtercount` smallint(5) unsigned NOT NULL COMMENT 'В непустых группах, свойств в фильтрах',
  `sourcecount` smallint(5) unsigned NOT NULL,
  `basketcount` mediumint(8) unsigned NOT NULL COMMENT 'Всего заказов с товарами этого сегмента',
  `ordercount` mediumint(8) unsigned NOT NULL COMMENT 'Заказов отправленных на проверку с товарами этого сегмента',
  `date_cost` datetime DEFAULT NULL COMMENT 'Актуальность',
  `withfilters` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть все фильтры для всех групп в которые эти позиции попадают',
  `withbrands` mediumint(8) unsigned NOT NULL,
  `withcost` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть цена',
  `withimg` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть картинка',
  `withdescr` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть описание',
  `withname` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть наименование',
  `withall` mediumint(8) unsigned NOT NULL COMMENT 'Позиций в группах, у которых есть всё',
  PRIMARY KEY (`year`,`month`,`source_id`) USING BTREE,
  KEY `FK_shop_stat_shop_groups` (`source_id`) USING BTREE,
  CONSTRAINT `FK_shop_stat_sources_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_transports
CREATE TABLE IF NOT EXISTS `shop_transports` (
  `order_id` mediumint(8) unsigned NOT NULL,
  `type` enum('city','self','cdek_pvz','any','cdek_courier','pochta_simple','pochta_1','pochta_courier') DEFAULT NULL COMMENT 'Выбор пользователя',
  `transport_cost` smallint(6) DEFAULT NULL COMMENT 'Цена',
  `min` tinyint(4) DEFAULT NULL COMMENT 'Cрок в днях',
  `max` tinyint(4) DEFAULT NULL COMMENT 'Cрок в днях',
  UNIQUE KEY `order_id` (`order_id`,`type`) USING BTREE,
  CONSTRAINT `FK_shop_transports_shop_orders` FOREIGN KEY (`order_id`) REFERENCES `shop_orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.shop_userorders
CREATE TABLE IF NOT EXISTS `shop_userorders` (
  `order_id` mediumint(8) unsigned NOT NULL,
  `user_id` mediumint(8) unsigned NOT NULL,
  PRIMARY KEY (`order_id`,`user_id`) USING BTREE,
  KEY `FK_shop_userorders_user_users` (`user_id`),
  CONSTRAINT `FK_shop_userorders_shop_orders` FOREIGN KEY (`order_id`) REFERENCES `shop_orders` (`order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_shop_userorders_user_users` FOREIGN KEY (`user_id`) REFERENCES `user_users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
