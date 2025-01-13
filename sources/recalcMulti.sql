
DROP PROCEDURE IF EXISTS recalcMulti;
DELIMITER //
CREATE PROCEDURE recalcMulti (IN source_id INT, OUT res INT)
BEGIN
	DECLARE done INT DEFAULT FALSE; 
	DECLARE text TEXT;
	DECLARE col_index INT; 
	DECLARE sheet_index INT; 
	DECLARE multi BIT; 
	DECLARE cnt INT; 
	
   DECLARE cur CURSOR FOR 
		SELECT 
			GROUP_CONCAT(ce.text SEPARATOR ", ") AS text, 
			co.col_index, 
			COUNT(*) AS cnt,
			co.sheet_index, 
			pr.multi + 0 as multi
		FROM sources_cells ce, sources_cols co
			LEFT JOIN sources_props pr on (pr.prop_id = co.prop_id)
		WHERE co.source_id = source_id
			AND ce.source_id = co.source_id
			AND ce.col_index = co.col_index
			AND ce.sheet_index = co.sheet_index
		GROUP BY ce.sheet_index, ce.row_index, ce.col_index;
	DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE; 
	
	OPEN cur;
	SET res = 0;

	read_loop: LOOP
		FETCH cur INTO text, col_index, cnt, sheet_index, multi;

		IF done THEN LEAVE read_loop;	END IF;

		
					
		IF (multi AND cnt = 1) THEN 
			IF (INSTR(text, ', ')) THEN
				/* есть запятая в записи, а записана 1
					надо удалить одну и записать несколько
				*/
				SET res = res + 1;
			END IF;
			SET res = res + 1;
		ELSEIF (!multi AND cnt > 1) THEN 
			/* есть две записи, а мульти не разрешено
				надо удалить обе и записать одну с text
			*/
			SET res = res - 1;
		END IF;
		
	END LOOP;
	CLOSE cur;
END //
DELIMITER ;

CALL recalcMulti(5, @res);
SELECT @res;
SHOW WARNINGS;