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

SELECT prop_id INTO brendart_prop_id FROM sources_wprops WHERE prop_nick = "brendart";
SELECT prop_id INTO brendmodel_prop_id FROM sources_wprops WHERE prop_nick = "brendmodel";
SELECT prop_id INTO brend_prop_id FROM sources_wprops WHERE prop_nick = "brend";
SELECT prop_id INTO cena_prop_id FROM sources_wprops WHERE prop_nick = "cena";
SELECT prop_id INTO name_prop_id FROM sources_wprops WHERE prop_nick = "naimenovanie";
SELECT prop_id INTO img_prop_id FROM sources_wprops WHERE prop_nick = "images";
SELECT prop_id INTO descr_prop_id FROM sources_wprops WHERE prop_nick = "opisanie";

DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_orders;
DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_keymbs;
DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_upgroups;
DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_filters;
DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_keysources;


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



-- DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_keysources;
-- DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_orders;
-- DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_keymbs;
-- DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_upgroups;
-- DROP TEMPORARY TABLE IF EXISTS shop_stat_temp_filters;
END