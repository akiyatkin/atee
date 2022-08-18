export class Upload {
	constructor (view, db) {
		this.view = view
		this.db = db
	}
	getOrCreateGroup ({group_nick, group, parent_nick, ordain = 1}) {
		// const group_id = await this.db.insertId(`INSERT INTO showcase_groups SET
		// 	type = :type, 
		// 	cost = :cost, 
		// 	min = :min, 
		// 	max =:max
		// ON DUPLICATE KEY UPDATE
		// 	cost = :cost, 
		// 	min = :min, 
		// 	max =:max
		// `, { name })
	}
}
