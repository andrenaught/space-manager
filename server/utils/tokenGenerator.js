const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const genAccessToken = (user_id) =>
	jwt.sign({ user_id }, process.env.JWT_SECRET, { expiresIn: '15m' })
const genRefreshToken = (user_id) =>
	jwt.sign({ user_id }, process.env.JWT_SECRET, { expiresIn: '365 days' })

// This is a unique key that each user has.
// - Due to its length, character set and how randomBytes works, the chance of generating the same value is highly improbable - same concept of uuid.
// - On the off chance a non-unique is generated, worst case is the user gets an error on api regeneration or account creation
const genSecretAPIKey = () => {
	const secretKey = crypto.randomBytes(32).toString('base64')
	return secretKey
}

const genRandomDigits = (size) => {
	if (size > 32) {
		throw new Error('size too large')
	}

	let code = ''

	// can be optimized more - instead of looping just base the randomBytes params based on the size
	// - ok for now, with a 6 digits length this should only loop once
	do {
		code += crypto.randomBytes(3).readUIntBE(0, 3)
	} while (code.length < size)

	return code.slice(0, size)
}

module.exports = {
	genAccessToken,
	genRefreshToken,
	genSecretAPIKey,
	genRandomDigits,
}
