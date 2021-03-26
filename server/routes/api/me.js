const express = require('express')
const validator = require('validator')
const bcrypt = require('bcrypt')
const db = require('../../db/index')
const { isLoggedIn } = require('../../middleware/auth')
const {
	genSecretAPIKey,
	genRandomDigits,
} = require('../../utils/tokenGenerator')
const { sendEmailVerification } = require('../../utils/email')

const router = express.Router()
const dashboardPerPage = 10

// get "my" credentials
router.get('/', isLoggedIn, async (req, res) => {
	const { more_info } = req.query
	const { user_id } = req

	let query = [
		'SELECT id, email, email_is_verified, username FROM users WHERE id=$1',
		[user_id],
	]
	if (more_info) {
		query = [
			'SELECT id, email, email_is_verified, username, secret_api_key FROM users WHERE id=$1',
			[user_id],
		]
	}

	try {
		const { rows } = await db.query(query[0], query[1])
		return res.json({ user: rows[0] })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.get('/spaces/owned', isLoggedIn, async (req, res) => {
	const { user_id } = req
	const { page = 0 } = req.query
	const per_page = dashboardPerPage
	try {
		const {
			rows,
		} = await db.query(
			`SELECT id, is_public, name, description, grid FROM spaces WHERE owner=$1 ORDER BY id DESC LIMIT ${per_page} OFFSET ${
				page * per_page
			}`,
			[user_id]
		)

		return res.json({ spaces: rows, per_page })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.get('/spaces/shared', isLoggedIn, async (req, res) => {
	const { user_id } = req
	const { page = 0, invite_status = 'accepted' } = req.query
	const per_page = dashboardPerPage
	let inviteAcceptedVal = '= TRUE'
	if (invite_status === 'pending') inviteAcceptedVal = 'IS NULL'
	try {
		const { rows } = await db.query(
			`
			SELECT sp.id as sp_id, s.id, s.is_public, s.name, s.grid, sp.invite_accepted
			FROM spaces s
			INNER JOIN space_participants sp
			ON s.id = sp.space_id
			WHERE sp.user_id=$1 AND invite_accepted ${inviteAcceptedVal}
			ORDER BY sp.id DESC LIMIT ${per_page} OFFSET ${page * per_page}`,
			[user_id]
		)

		return res.json({ spaces: rows, per_page })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.get('/spaces/saved', isLoggedIn, async (req, res) => {
	const { user_id } = req
	const { page = 0 } = req.query
	const per_page = dashboardPerPage
	try {
		const { rows } = await db.query(
			`
			SELECT fs.id as fs_id, s.id, s.is_public, s.name, s.grid
			FROM spaces s
			INNER JOIN favorited_spaces fs
			ON s.id = fs.space_id
			WHERE fs.user_id=$1
			ORDER BY fs.id DESC LIMIT ${per_page} OFFSET ${page * per_page}`,
			[user_id]
		)

		return res.json({ spaces: rows, per_page })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.put('/password', isLoggedIn, async (req, res) => {
	const { user_id } = req
	const { newPass, oldPass } = req.body
	if (![newPass, oldPass].every(Boolean))
		return res.status(400).json({ message: 'Missing values' })

	try {
		const userRes = await db.query(`SELECT password FROM users WHERE id=$1`, [
			user_id,
		])
		if (userRes.rows.length === 0)
			return res.status(404).json({ message: 'User not found' })
		const user = userRes.rows[0]

		// Check password
		const passwordGood = await bcrypt.compare(oldPass, user.password)
		if (!passwordGood)
			return res.status(401).json({ message: 'password is incorrect' })

		// User is authorized at this point
		const salt = await bcrypt.genSalt(10)
		const bcryptPassword = await bcrypt.hash(newPass, salt)
		const { rows } = await db.query(
			`
			UPDATE users SET password=$1 WHERE id=$2 RETURNING id`,
			[bcryptPassword, user_id]
		)
		if (rows.length === 0)
			return res.status(404).json({ message: 'User not found' })

		return res.json({})
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.put('/regenerate_api_key', isLoggedIn, async (req, res) => {
	const { user_id } = req

	try {
		const secretAPIKey = genSecretAPIKey()
		const { rows } = await db.query(
			`
			UPDATE users SET secret_api_key=$1 WHERE id=$2 RETURNING secret_api_key`,
			[secretAPIKey, user_id]
		)
		if (rows.length === 0)
			return res.status(400).json({ message: 'User not found' })

		return res.json({ user: rows[0] })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.put('/email', isLoggedIn, async (req, res) => {
	const { user_id } = req
	const { email } = req.body

	if (![email].every(Boolean))
		return res.status(400).json({ message: 'Missing values' })
	if (!validator.isEmail(email))
		return res.status(400).json({ message: 'Invalid email' })

	try {
		const verifCode = genRandomDigits(6)

		const { rows } = await db.query(
			`
			UPDATE users SET email=$2, email_is_verified=FALSE, email_code=$3, email_code_date=NOW() WHERE id=$1 RETURNING email, email_is_verified`,
			[user_id, email, verifCode]
		)
		if (rows.length === 0)
			return res.status(404).json({ message: 'User not found' })

		const emailSent = await sendEmailVerification({
			to: email,
			code: verifCode,
		})

		return res.json({ user: rows[0], emailSent })
	} catch (err) {
		if (err.code === '23505' && err.constraint === 'users_email_key') {
			return res.status(409).json({ message: 'Email is already taken.' })
		}

		console.error(err)
		return res.status(500).json({})
	}
})

router.put('/resend_email_verification', isLoggedIn, async (req, res) => {
	const { user_id } = req

	try {
		const {
			rows,
		} = await db.query(
			`SELECT email, email_code, email_is_verified, email_code_date FROM users WHERE id=$1`,
			[user_id]
		)
		if (rows.length === 0)
			return res.status(404).json({ message: 'User not found' })
		const { email, email_code, email_is_verified, email_code_date } = rows[0]

		const expDate = new Date(email_code_date)
		expDate.setHours(expDate.getHours() + 2)
		const isExpired = expDate < new Date()
		if (email_is_verified)
			return res
				.status(422)
				.json({ message: 'Current email is already verified' })

		let verifCode = email_code
		if (isExpired) {
			verifCode = genRandomDigits(6)
			await db.query(
				`UPDATE users SET email_code=$2, email_code_date=NOW() WHERE id=$1`,
				[user_id, verifCode]
			)
		}

		const emailSent = await sendEmailVerification({
			to: email,
			code: verifCode,
		})

		return res.json({ emailSent })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.put('/verify_email', isLoggedIn, async (req, res) => {
	const { user_id } = req
	const { code } = req.body

	if (![code].every(Boolean))
		return res.status(400).json({ message: 'Missing values' })

	try {
		const {
			rows,
		} = await db.query(
			`SELECT email_code, email_is_verified, email_code_date FROM users WHERE id=$1`,
			[user_id]
		)
		if (rows.length === 0)
			return res.status(404).json({ message: 'User not found' })
		const { email_code, email_is_verified, email_code_date } = rows[0]

		// Check if valid action
		const expDate = new Date(email_code_date)
		expDate.setHours(expDate.getHours() + 2)
		const isExpired = expDate < new Date()
		if (email_code == null)
			return res.status(404).json({ message: 'No email code found' })
		if (email_is_verified)
			return res
				.status(422)
				.json({ message: 'Current email is already verified' })
		if (email_code !== code)
			return res.status(404).json({ message: 'Invalid code' })
		if (isExpired) return res.status(422).json({ message: 'Code has expired' })

		const updateRes = await db.query(
			`UPDATE users SET email_is_verified=TRUE, email_code=NULL, email_code_date=NULL WHERE id=$1 returning email_is_verified`,
			[user_id]
		)
		if (updateRes.rows.length === 0)
			return res.status(404).json({ message: 'User not found' })
		return res.json({ user: updateRes.rows[0] })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

module.exports = router
