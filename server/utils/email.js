const nodemailer = require('nodemailer')
const fetch = require('node-fetch')
const FormData = require('form-data')

// Generic email function
// - make it easy to change emailing system, whether it's a 3rd party emailing service or using own mail server.
// - Returns {success: true} if successful, returns {success: false, message: 'reason'} otherwise
const sendEmail = async (info) => {
	// validation
	if (!info) return { success: false, message: 'Missing values' }
	const { from, to, subject, html } = info
	if (![from, to, subject, html].every(Boolean))
		return { success: false, message: 'Missing values' }
	const email_type = process.env.TRANSAC_EMAILER_TYPE

	if (email_type === 'smtp') {
		// create reusable transporter object using the default SMTP transport
		const transporter = nodemailer.createTransport({
			host: process.env.TRANSAC_EMAILER_HOST,
			port: process.env.TRANSAC_EMAILER_PORT,
			secure: false, // true for 465, false for other ports
			auth: {
				user: process.env.TRANSAC_EMAILER, // generated ethereal user
				pass: process.env.TRANSAC_EMAILER_PASS, // generated ethereal password
			},
		})

		// send mail with defined transport object
		try {
			await transporter.sendMail({
				from,
				to,
				subject,
				html,
			})
		} catch (err) {
			return { success: false }
		}
	} else if (email_type === 'mailgun_api') {
		const body = new FormData()
		body.append('from', from)
		body.append('to', to)
		body.append('subject', subject)
		body.append('html', html)
		try {
			const response = await fetch(
				`${process.env.TRANSAC_EMAILER_API_URL}/messages`,
				{
					method: 'POST',
					headers: {
						Authorization: `Basic ${Buffer.from(
							process.env.TRANSAC_EMAILER_API_KEY
						).toString('base64')}`,
					},
					body,
				}
			)
			const data = await response.json()
			if (response.status !== 200) {
				if (data.message) {
					return { success: false, message: data.message }
				}
				return { success: false, message: response.statusText }
			}
		} catch (err) {
			return { success: false }
		}
	} else {
		return { success: false, message: 'email type not found' }
	}

	return { success: true }
}

const sendEmailVerification = async (inputInfo) => {
	if (!inputInfo) return false
	const { to, code } = inputInfo
	if (!to || !code) return false

	const info = {
		from: `"Space Manager" <noreply@${process.env.TRANSAC_EMAILER_DOMAIN}>`, // sender address
		to, // list of receivers
		subject: 'Email Verification', // Subject line
		html: `<div>
    	<h1>Email Verification</h1>
    	<p>This is to verify this email address belongs to you, please enter this code on the email verification page:</p>
    	<div style='font-size: 22px'><b><p>${code}</p></b></div>
    </div>`,
	}

	const emailRes = await sendEmail(info)
	if (!emailRes.success) {
		console.trace()
		console.error(emailRes.message)
	}
	return emailRes.success
}

const sendPasswordReset = async (inputInfo) => {
	if (!inputInfo) return false
	const { to, code, username } = inputInfo
	if (!to || !code || !username) return false

	const info = {
		from: `"Space Manager" <noreply@${process.env.TRANSAC_EMAILER_DOMAIN}>`, // sender address
		to, // list of receivers
		subject: 'Password Reset Request', // Subject line
		html: `<div>
    	<h1>Password Reset</h1>
    	<p>This is a request to reset your password for <b>${username}</b>, please enter this code on the password reset request page:</p>
    	<div style='font-size: 18px'><b><p>${code}</p></b></div>
    </div>`,
	}

	const emailRes = await sendEmail(info)
	if (!emailRes.success) {
		console.trace()
		console.error(emailRes.message)
	}
	return emailRes.success
}

module.exports = { sendEmailVerification, sendPasswordReset }
