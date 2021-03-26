const express = require('express')
const validator = require('email-validator')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const db = require('../../db/index')
const { sendPasswordReset } = require('../../utils/email')
const {
	genAccessToken,
	genRefreshToken,
	genSecretAPIKey,
} = require('../../utils/tokenGenerator')

const usernameRegex = new RegExp(/^$|^[a-zA-Z0-9_]*$/)
const router = express.Router()
const genAuthTokens = async (user_id) => {
	const aToken = genAccessToken(user_id)
	const rToken = genRefreshToken(user_id)
	await db.query(
		'INSERT INTO sessions (r_token, user_id) VALUES ($1, $2) RETURNING *',
		[rToken, user_id]
	)
	return { aToken, rToken }
}

// create / register
router.post('/', async (req, res) => {
	const { password, email } = req.body
	if (![req.body.username, password].every(Boolean))
		return res.status(400).json({ message: 'Missing values' })
	if (email && !validator.validate(email))
		return res.status(400).json({ message: 'Invalid email' })
	const username = req.body.username.toLowerCase()
	if (!usernameRegex.test(username))
		return res
			.status(400)
			.json({ message: 'Username contains invalid characters' })

	// Create user in database
	try {
		const salt = await bcrypt.genSalt(10)
		const bcryptPassword = await bcrypt.hash(password, salt)
		const secretAPIKey = genSecretAPIKey()

		const {
			rows,
		} = await db.query(
			'INSERT INTO users (username, password, email, secret_api_key) VALUES ($1, $2, $3, $4) RETURNING id, username, email_is_verified',
			[username, bcryptPassword, email, secretAPIKey]
		)

		// Send back access + refresh token (after storing refresh token in DB)
		const user = rows[0]
		const tokens = await genAuthTokens(user.id)

		return res.json({
			...tokens,
			user: {
				id: user.id,
				username: user.username,
				email_is_verified: user.email_is_verified,
			},
		})
	} catch (err) {
		if (err.code === '23505' && err.constraint === 'users_username_key') {
			return res.status(409).json({ message: 'Username is already taken.' })
		}

		console.error(err)
		return res.status(500).json({})
	}
})

// login
router.post('/login', async (req, res) => {
	const { password } = req.body
	if (![req.body.username, password].every(Boolean))
		return res.status(400).json({ message: 'Missing values' })
	const username = req.body.username.toLowerCase()

	// Check if user exists
	try {
		const {
			rows,
		} = await db.query(
			'SELECT id, username, password, email_is_verified FROM users WHERE username=$1',
			[username]
		)
		if (rows.length === 0)
			return res.status(404).json({ message: 'username does not exist' })

		// Check password
		const user = rows[0]
		const passwordGood = await bcrypt.compare(password, user.password)
		if (!passwordGood)
			return res.status(401).json({ message: 'password is incorrect' })

		// Send back access + refresh token (after storing refresh token in DB)
		const tokens = await genAuthTokens(user.id)

		return res.json({
			...tokens,
			user: {
				id: user.id,
				username: user.username,
				email_is_verified: user.email_is_verified,
			},
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.post('/reset_password_request', async (req, res) => {
	const { email } = req.body

	// find email in users table and ensure its verified
	try {
		const {
			rows,
		} = await db.query(
			'SELECT id, email_is_verified, username, password_code, password_code_date FROM users WHERE email=$1',
			[email]
		)
		if (rows.length === 0)
			return res.status(400).json({ message: 'Email not found' })
		const {
			email_is_verified,
			username,
			password_code,
			password_code_date,
		} = rows[0]
		const user_id = rows[0].id

		if (!email_is_verified)
			return res.status(422).json({ message: 'Email is not verified' })

		let needNewCode = false
		if (password_code == null) {
			needNewCode = true
		} else if (password_code_date != null) {
			const expDate = new Date(password_code_date)
			expDate.setHours(expDate.getHours() + 2)
			const isExpired = expDate < new Date()
			if (isExpired) needNewCode = true
		}

		let passwordCode = password_code
		if (needNewCode) {
			passwordCode = crypto.randomBytes(8).toString('hex').slice(0, 8)
			await db.query(
				'UPDATE users SET password_code=$2, password_code_date=NOW() WHERE id=$1',
				[user_id, passwordCode]
			)
		}

		// Send email
		const emailSent = await sendPasswordReset({
			username,
			to: email,
			code: passwordCode,
		})

		return res.json({ emailSent })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

const checkResetPasswordCode = async (code, email) => {
	const {
		rows,
	} = await db.query(
		`SELECT username, email_is_verified, password_code, password_code_date FROM users WHERE email=$1`,
		[email]
	)
	if (rows.length === 0)
		return { success: false, code: 404, message: 'User not found' }

	const {
		username,
		email_is_verified,
		password_code_date,
		password_code,
	} = rows[0]
	const expDate = new Date(password_code_date)
	expDate.setHours(expDate.getHours() + 2)
	const isExpired = expDate < new Date()
	if (password_code == null)
		return {
			success: false,
			code: 404,
			message: 'No password reset requests found',
		}
	if (!email_is_verified)
		return {
			success: false,
			code: 422,
			message: 'Email is not verified for this account',
		}
	if (password_code !== code)
		return { success: false, code: 404, message: 'Invalid code' }
	if (isExpired)
		return { success: false, code: 422, message: 'Code has expired' }

	return { success: true, data: { username } }
}

router.post('/check_reset_password', async (req, res) => {
	const { code, email } = req.body

	try {
		const passwordCodeCheck = await checkResetPasswordCode(code, email)
		if (!passwordCodeCheck.success) {
			return res
				.status(passwordCodeCheck.code)
				.json({ message: passwordCodeCheck.message })
		}

		return res.json({ username: passwordCodeCheck.data.username })
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

router.put('/reset_password', async (req, res) => {
	const { code, email, new_password } = req.body

	try {
		const passwordCodeCheck = await checkResetPasswordCode(code, email)
		if (!passwordCodeCheck.success) {
			return res
				.status(passwordCodeCheck.code)
				.json({ message: passwordCodeCheck.message })
		}

		// change pass
		const salt = await bcrypt.genSalt(10)
		const bcryptPassword = await bcrypt.hash(new_password, salt)
		const {
			rows,
		} = await db.query(
			`UPDATE users SET password=$2, password_code=NULL, password_code_date=NULL WHERE email=$1 RETURNING id, username, email_is_verified`,
			[email, bcryptPassword]
		)
		if (rows.length === 0)
			return res.status(404).json({ message: 'User not found' })
		const user = rows[0]

		// log all out all sessions
		await db.query(`DELETE FROM sessions WHERE user_id=$1`, [user.id])

		// log them in
		const tokens = await genAuthTokens(user.id)

		return res.json({
			...tokens,
			user: {
				id: user.id,
				username: user.username,
				email_is_verified: user.email_is_verified,
			},
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({})
	}
})

module.exports = router
