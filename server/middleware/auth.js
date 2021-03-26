const jwt = require('jsonwebtoken')
const { genAccessToken } = require('../utils/tokenGenerator')
const db = require('../db/index')

// Will check if user is logged in
// - Handles refresh token rotation
const verifyAuthTokens = async (aToken, rToken) => {
	if (aToken == null || aToken === 'null') return false
	return jwt.verify(aToken, process.env.JWT_SECRET, (aTokenErr, aTokenBody) => {
		if (!aTokenErr) return { user_id: aTokenBody.user_id }

		// Check refresh token in DB
		return jwt.verify(rToken, process.env.JWT_SECRET, async (rTokenErr) => {
			if (rTokenErr) return false

			try {
				// POSSIBLE IMPROVEMENT: Rotating refresh token
				// Update current refresh token with new one on every refresh - allow for better security. Keep user forever logged in if theyre active
				// Not implementing this for now, ran into race condition issues (2 fetches immediately after each other, issue was 2nd fetch would be using old rToken)
				const {
					rows,
				} = await db.query(
					`UPDATE sessions SET last_refresh = NOW() WHERE r_token=$1 returning *`,
					[rToken]
				)

				if (rows.length === 0 || !rows[0]) return false
				const session = rows[0]
				const newAToken = genAccessToken(session.user_id)
				const newRToken = rToken
				return { newAToken, newRToken, user_id: session.user_id }
			} catch (fetchErr) {
				console.error(fetchErr)
				return false
			}
		})
	})
}

// isLoggedIn & checkAuth should logically work the same except for the actions taken
// - isLoggedIn: will only next() if a user is logged in (return 401 otherwise)
// - checkAuth: will always next(), it simply provides user information
const isLoggedIn = async (req, res, next) => {
	// Setup
	const aToken = req.headers.authorization?.split(' ')[1]
	const rToken = req.headers['x-r-token']

	// Check if valid tokens
	if (aToken == null || aToken === 'null')
		return res.status(401).json({ message: 'Token not found' })
	const authTokenData = await verifyAuthTokens(aToken, rToken)
	if (!authTokenData)
		return res.status(401).json({ message: 'Token not found' })

	// Setup response
	const { newAToken, newRToken, user_id } = authTokenData
	if (newAToken) res.set('x-a-token', newAToken)
	if (newRToken) res.set('x-r-token', newRToken)
	req.user_id = user_id
	return next()
}
// gets user's identity. Unlike isLoggedIn(), this does not take any action if user is not logged in
const checkAuth = async (req, res, next) => {
	// Setup
	const aToken = req.headers.authorization?.split(' ')[1]
	const rToken = req.headers['x-r-token']

	// Check if valid tokens
	if (aToken == null || aToken === 'null') return next()
	const authTokenData = await verifyAuthTokens(aToken, rToken)
	if (!authTokenData) return next()

	// Setup response
	const { newAToken, newRToken, user_id } = authTokenData
	if (newAToken) res.set('x-a-token', newAToken)
	if (newRToken) res.set('x-r-token', newRToken)
	req.user_id = user_id
	return next()
}

module.exports = { isLoggedIn, checkAuth }
