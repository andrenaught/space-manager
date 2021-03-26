const { Pool } = require('pg')

const pool = new Pool({
	user: process.env.DB_USER,
	host: '127.0.0.1',
	database: process.env.DB_NAME,
	password: process.env.DB_PASS,
	port: 5432,
})
module.exports = {
	query: (text, params) => pool.query(text, params),
}
