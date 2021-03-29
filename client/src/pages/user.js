import React, { useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { IoCheckmarkSharp, IoMail } from 'react-icons/io5'
import { MdModeEdit } from 'react-icons/md'
import useFetch from 'src/components/utils/useFetch'
import { AuthContext } from 'src/Store'
import { TextWithCopy } from 'src/components/UI'

const ChangePasswordForm = ({ onCancel }) => {
	const appFetch = useFetch()
	const [isLoading, setIsLoading] = useState(false)
	const [oldPass, setOldPass] = useState('')
	const [newPass, setNewPass] = useState('')
	const [newPassConfirm, setNewPassConfirm] = useState('')
	const [changePassSuccess, setChangePassSuccess] = useState(false)

	const changePassSubmit = async (e) => {
		e.preventDefault()
		if (newPass !== newPassConfirm) {
			alert(`Passwords don't match`)
			return
		}

		setIsLoading(true)
		const { ok } = await appFetch(`/api/me/password`, {
			method: 'PUT',
			body: JSON.stringify({ newPass, oldPass }),
		})
		setIsLoading(false)
		if (!ok) return

		setChangePassSuccess(true)
	}

	return (
		<>
			{!changePassSuccess ? (
				<form onSubmit={(e) => changePassSubmit(e)}>
					<input
						value={oldPass}
						onChange={(e) => setOldPass(e.target.value)}
						className="input-g small"
						placeholder="Old password"
						type="password"
					/>
					<input
						value={newPass}
						onChange={(e) => setNewPass(e.target.value)}
						className="input-g small"
						placeholder="New password"
						type="password"
					/>
					<input
						value={newPassConfirm}
						onChange={(e) => setNewPassConfirm(e.target.value)}
						className="input-g small"
						placeholder="Confirm new password"
						type="password"
					/>
					<button disabled={isLoading} type="submit" className="btn-g primary">
						Submit
					</button>
					<button
						onClick={() => onCancel()}
						type="button"
						className="btn-g clear"
						style={{ marginBottom: '0px', marginLeft: '10px' }}
					>
						Cancel
					</button>
				</form>
			) : (
				<div>
					<small>Successfully changed password.</small>
				</div>
			)}
		</>
	)
}

ChangePasswordForm.propTypes = {
	onCancel: PropTypes.func.isRequired,
}

const UserPage = () => {
	const appFetch = useFetch()
	const authCtx = useContext(AuthContext)
	const globalUser = authCtx.user
	const setGlobalUser = authCtx.setUser
	const [isLoading, setIsLoading] = useState(true)
	const [user, setUser] = useState(null)
	const [changePassIsOpen, openChangePass] = useState(false)
	const [showAPIKey, setShowAPIKey] = useState(false)
	const [enableRegenAPIKeyBtn, setEnableRegenAPIKeyBtn] = useState(true)
	const [changeEmailIsOpen, openChangeEmail] = useState(false)
	const [email, setEmail] = useState('')
	const [verifyEmailSent, setVerifyEmailSent] = useState(false)
	const [changeEmailIsLoading, setChangeEmailIsLoading] = useState(false)
	const [emailCode, setEmailCode] = useState('')
	const [showIsVerified, setShowIsVerified] = useState(false)

	const getMe = async () => {
		const { data, ok } = await appFetch(`/api/me?more_info=1`)
		if (!ok) return

		setUser(data.user)
		setEmail(data.user.email || '')
		setIsLoading(false)
	}
	useEffect(() => {
		getMe()
	}, [])

	const generateNewAPIKey = async () => {
		const { data, ok } = await appFetch(`/api/me/regenerate_api_key`, {
			method: 'PUT',
		})
		if (!ok) return

		setEnableRegenAPIKeyBtn(false)
		setUser({ ...user, ...data.user })
	}

	const changeEmail = async (e) => {
		e.preventDefault()
		setChangeEmailIsLoading(true)
		const { data, ok } = await appFetch(`/api/me/email`, {
			method: 'PUT',
			body: JSON.stringify({ email }),
		})
		setChangeEmailIsLoading(false)
		if (!ok) return

		setShowIsVerified(false)
		setEmailCode('')
		openChangeEmail(false)
		setGlobalUser({
			...globalUser,
			email_is_verified: data.user.email_is_verified,
		})
		if (data.emailSent) {
			setVerifyEmailSent(true)
		} else {
			alert('Email verification could not be sent')
		}
		setUser({ ...user, ...data.user })
	}

	const resendVerifyEmail = async () => {
		setChangeEmailIsLoading(true)
		const { data, ok } = await appFetch(`/api/me/resend_email_verification`, {
			method: 'PUT',
			body: JSON.stringify({ email }),
		})
		setChangeEmailIsLoading(false)
		if (!ok) return

		if (data.emailSent) {
			setVerifyEmailSent(true)
		} else {
			alert('Email verification could not be sent')
		}
	}

	const verifyEmail = async (e) => {
		e.preventDefault()
		setChangeEmailIsLoading(true)
		const { data, ok } = await appFetch(`/api/me/verify_email`, {
			method: 'PUT',
			body: JSON.stringify({ code: emailCode }),
		})
		setChangeEmailIsLoading(false)
		if (!ok) return

		setGlobalUser({
			...globalUser,
			email_is_verified: data.user.email_is_verified,
		})
		setShowIsVerified(true)
		setUser({ ...user, ...data.user })
	}

	if (isLoading) {
		return (
			<div
				style={{
					position: 'absolute',
					width: '100%',
					textAlign: 'center',
					top: '50%',
				}}
			>
				Loading...
			</div>
		)
	}

	return (
		<div className="container-g" style={{ marginTop: '20px' }}>
			<div style={{ width: '400px', maxWidth: '100%' }}>
				<div className="label-g">My Account</div>
				<div>
					<div className="label-g small">username</div>
					<div className="marg-bot-g">{user.username}</div>

					<div className="label-g small">Password</div>

					{!changePassIsOpen ? (
						<div className="input-w-btns-g">
							<input
								className="input-g small"
								type="password"
								value={changePassIsOpen ? '' : '*****************'}
								disabled={!changePassIsOpen}
							/>
							<button
								type="button"
								className="btn-g small"
								disabled={changePassIsOpen}
								onClick={() => openChangePass(true)}
							>
								<MdModeEdit />
							</button>
						</div>
					) : (
						<div className="marg-bot-g">
							<ChangePasswordForm onCancel={() => openChangePass(false)} />
						</div>
					)}

					<div>
						<form onSubmit={(e) => changeEmail(e)}>
							<div className="label-g small">Email</div>
							<div className="input-w-btns-g">
								<input
									className="input-g small no-marg"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={!changeEmailIsOpen}
									required
								/>
								<button
									type="button"
									className="btn-g small"
									disabled={changeEmailIsOpen}
									onClick={() => openChangeEmail(true)}
								>
									<MdModeEdit />
								</button>
							</div>
							{changeEmailIsOpen && (
								<div className="marg-top-g">
									<button
										disabled={user.email === email || changeEmailIsLoading}
										type="submit"
										className="btn-g primary"
									>
										Submit
									</button>
									<button
										onClick={() => {
											openChangeEmail(false)
											setEmail(user.email)
										}}
										type="button"
										className="btn-g clear"
									>
										Cancel
									</button>
								</div>
							)}
						</form>
						{!changeEmailIsOpen && user.email != null && (
							<div>
								{showIsVerified && (
									<div
										className="label-g no-upper small"
										style={{ marginTop: '3px' }}
									>
										Email verified&nbsp;
										<IoCheckmarkSharp />
									</div>
								)}
								{!user.email_is_verified && (
									<div
										className="label-g small-med"
										style={{ marginTop: '3px' }}
									>
										<span className="label-g no-marg no-upper small-med danger">
											Not verified&nbsp;
											<span className="color-text-g">-</span>
											&nbsp;
										</span>
										{verifyEmailSent ? (
											<div className="label-g no-marg no-upper small-med dark">
												<span>Verification email sent</span>
												&nbsp;
												<IoMail className="icon" />
											</div>
										) : (
											<button
												type="button"
												className="btn-g clear small-med normal-weight"
												onClick={() => resendVerifyEmail()}
												disabled={changeEmailIsLoading}
											>
												Resend email
											</button>
										)}
									</div>
								)}
								{!user.email_is_verified && (
									<div style={{ marginTop: '10px' }}>
										<div className="label-g small">Enter verification code</div>
										<form onSubmit={(e) => verifyEmail(e)}>
											<input
												required
												value={emailCode}
												onChange={(e) => setEmailCode(e.target.value)}
												className="input-g small small-marg"
												type="text"
											/>
											<button
												className="btn-g primary small"
												disabled={changeEmailIsLoading}
												type="submit"
											>
												Submit
											</button>
										</form>
									</div>
								)}
							</div>
						)}
					</div>
					<div className="separator-g" />
					<div className="marg-bot-g">
						<div style={{ marginBottom: '5px' }}>
							<button
								disabled={showAPIKey}
								className="btn-g small"
								type="button"
								onClick={() => setShowAPIKey(true)}
							>
								Show Secret API Key
							</button>
							{showAPIKey && (
								<>
									<button
										className="btn-g small"
										style={{ marginLeft: '5px' }}
										type="button"
										onClick={() => generateNewAPIKey()}
										disabled={!enableRegenAPIKeyBtn}
									>
										{enableRegenAPIKeyBtn ? (
											'Generate new API Key'
										) : (
											<span style={{ display: 'flex', alignItems: 'center' }}>
												New API Key generated&nbsp;
												<IoCheckmarkSharp />
											</span>
										)}
									</button>
									<button
										className="btn-g clear small"
										type="button"
										onClick={() => setShowAPIKey(false)}
									>
										Hide
									</button>
								</>
							)}
						</div>
						{showAPIKey && <TextWithCopy text={user.secret_api_key} />}
					</div>
				</div>
			</div>
		</div>
	)
}

export { UserPage }
export default UserPage
