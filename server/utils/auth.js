const db = require('../db/index')

const isSpaceOwner = async (user_id, space_id) => {
	try {
		const {
			rows,
		} = await db.query(`SELECT id FROM spaces WHERE owner=$1 AND id=$2`, [
			user_id,
			space_id,
		])
		if (rows.length === 0) return false
		return true
	} catch (err) {
		console.error(err)
		return false
	}
}

module.exports = { isSpaceOwner }
