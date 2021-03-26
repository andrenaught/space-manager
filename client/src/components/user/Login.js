import React, { useEffect, useState, useRef, useContext } from 'react'
import PropTypes from 'prop-types'
import { useHistory } from 'react-router-dom'
import { IoIosLogIn } from 'react-icons/io'
import { IoMailOutline } from 'react-icons/io5'
import { AuthContext } from 'src/Store'
import useFetch from 'src/components/utils/useFetch'
import sty from './Login.module.scss'

const usernameRegex = new RegExp(/^$|^[a-zA-Z0-9_]*$/)
const useLogin = () => {
	const appFetch = useFetch()
	const history = useHistory()
	const { setAccessToken, setRefreshToken, setUser } = useContext(AuthContext)

	const appLoginWithToken = (aToken, rToken, user, redirect = null) => {
		if (
			[user.id, user.username, user.email_is_verified].some((x) => x == null)
		) {
			alert('Could not login, server did not provide enough data')
			return
		}

		localStorage.setItem('aToken', aToken)
		localStorage.setItem('rToken', rToken)
		setAccessToken(aToken)
		setRefreshToken(rToken)
		setUser(user)

		if (redirect != null) {
			history.replace(redirect)
		}
	}

	const appLogin = async (username, password, redirect = null) => {
		const body = { username, password }
		const { data, ok } = await appFetch('/api/users/login', {
			method: 'POST',
			body: JSON.stringify(body),
		})
		if (!ok) return

		const { aToken, rToken, user } = data
		appLoginWithToken(aToken, rToken, user, redirect)
	}

	return { appLogin, appLoginWithToken }
}

const RegisterForm = (props) => {
	const appFetch = useFetch()
	const { appLoginWithToken } = useLogin()

	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [isSuccess, setIsSuccess] = useState(false)
	const usernameInput = useRef(null)
	const register = async (e) => {
		e.preventDefault()

		if (password !== confirmPassword) {
			alert(`Passwords don't match`)
			return
		}

		const body = { username, password }
		const { data, ok } = await appFetch('/api/users', {
			method: 'POST',
			body: JSON.stringify(body),
		})
		if (!ok) return

		setIsSuccess(true)
		const { aToken, rToken, user } = data
		appLoginWithToken(aToken, rToken, user, '/dashboard')
	}
	useEffect(() => {
		usernameInput.current?.focus()
	}, [])

	if (isSuccess) {
		return (
			<div className={sty.container}>
				Registration successful
				<div className={sty.footer}>
					<div className={sty.footerItem}>
						<small>
							<button
								type="button"
								className="link-g"
								onClick={() => props.showLogin()}
							>
								Back to login
							</button>
						</small>
					</div>
				</div>
			</div>
		)
	}

	return (
		<form onSubmit={(e) => register(e)} className={sty.container}>
			<div className="label-g small">sign up</div>
			<input
				required
				value={username}
				onChange={(e) => setUsername(e.target.value)}
				ref={usernameInput}
				placeholder="Username"
				className={`input-g${!usernameRegex.test(username) ? ' invalid' : ''}`}
				type="text"
			/>
			<input
				required
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				placeholder="Password"
				className="input-g"
				type="password"
			/>
			<input
				required
				value={confirmPassword}
				onChange={(e) => setConfirmPassword(e.target.value)}
				placeholder="Confirm password"
				className="input-g"
				type="password"
			/>
			<div className={sty.footer}>
				<button className="btn-g centered primary" type="submit">
					CREATE ACCOUNT
					<IoIosLogIn className="icon" />
				</button>
				<div className={sty.footerItem}>
					<small>
						Already have an account?&nbsp;
						<button
							type="button"
							className="link-g"
							onClick={() => props.showLogin()}
						>
							Log in
						</button>
					</small>
				</div>
			</div>
		</form>
	)
}

RegisterForm.propTypes = {
	showLogin: PropTypes.func.isRequired,
}

const ForgotPassword = (props) => {
	const appFetch = useFetch()
	const { appLoginWithToken } = useLogin()
	const { onCancel } = props
	const [email, setEmail] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [codeInputIsOpen, setCodeInputIsOpen] = useState(false)
	const [emailCode, setEmailCode] = useState('')
	const [username, setUsername] = useState('')
	const [newPassInputIsOpen, setNewPassInputIsOpen] = useState(false)
	const [newPass, setNewPass] = useState('')
	const [newPassConfirm, setNewPassConfirm] = useState('')
	const [isSuccess, setIsSuccess] = useState(false)
	const emailInputRef = useRef(null)

	const resetPassRequest = async (e) => {
		e.preventDefault()
		setIsLoading(true)
		const { ok } = await appFetch('/api/users/reset_password_request', {
			method: 'POST',
			body: JSON.stringify({ email }),
		})
		setIsLoading(false)
		if (!ok) return

		setCodeInputIsOpen(true)
	}

	const resetPassCheck = async (e) => {
		e.preventDefault()
		setIsLoading(true)
		const { data, ok } = await appFetch('/api/users/check_reset_password', {
			method: 'POST',
			body: JSON.stringify({ code: emailCode, email }),
		})
		setIsLoading(false)
		setUsername(data.username)
		if (!ok) return

		setNewPassInputIsOpen(true)
	}

	const resetPass = async (e) => {
		e.preventDefault()
		if (newPass !== newPassConfirm) {
			alert(`Passwords don't match`)
			return
		}

		setIsLoading(true)
		const { data, ok } = await appFetch('/api/users/reset_password', {
			method: 'PUT',
			body: JSON.stringify({ code: emailCode, email, new_password: newPass }),
		})
		setIsLoading(false)
		if (!ok) return

		setIsSuccess(true)
		const { aToken, rToken, user } = data
		appLoginWithToken(aToken, rToken, user, '/dashboard')
	}

	useEffect(() => {
		emailInputRef.current?.focus()
	}, [])

	if (isSuccess) {
		return (
			<div className={sty.container}>
				Password reset successful
				<div className={sty.footer}>
					<div className={sty.footerItem}>
						<small>
							<button
								type="button"
								className="link-g"
								onClick={() => onCancel()}
							>
								Back to login
							</button>
						</small>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className={sty.container}>
			{!codeInputIsOpen && (
				<>
					<p style={{ marginTop: '0px' }}>
						<small>
							Forgot your username? This form will also provide your username to
							your email.
						</small>
					</p>
					<form onSubmit={(e) => resetPassRequest(e)}>
						<div className="label-g small">Forgot password or username</div>
						<input
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							ref={emailInputRef}
							placeholder="Email"
							className="input-g"
							type="email"
							disabled={codeInputIsOpen}
						/>
						<div className={sty.footer}>
							<button
								className="btn-g primary"
								type="submit"
								disabled={isLoading || codeInputIsOpen}
							>
								VERIFY EMAIL
								<IoMailOutline className="icon" />
							</button>
							<div className={sty.footerItem}>
								<small>
									<button
										type="button"
										className="link-g"
										onClick={() => onCancel()}
									>
										Back to login
									</button>
								</small>
							</div>
						</div>
					</form>
				</>
			)}
			{codeInputIsOpen && !newPassInputIsOpen && (
				<div>
					<form onSubmit={(e) => resetPassCheck(e)}>
						<div className="label-g no-upper small">
							You should receive a code in your email
						</div>
						<input
							required
							value={emailCode}
							onChange={(e) => setEmailCode(e.target.value)}
							placeholder="Enter your Code"
							className="input-g"
							type="text"
						/>
						<div className={sty.footer}>
							<button
								type="submit"
								className="btn-g primary"
								disabled={isLoading}
							>
								Verify
							</button>
							<div className={sty.footerItem}>
								<small>
									<button
										type="button"
										className="link-g"
										onClick={() => setCodeInputIsOpen(false)}
									>
										Didn&apos;t receive your code?
									</button>
								</small>
							</div>
						</div>
					</form>
				</div>
			)}

			{newPassInputIsOpen && (
				<div>
					<div className="label-g small">Username</div>
					<div style={{ marginBottom: '10px' }}>{username}</div>
					<form onSubmit={(e) => resetPass(e)}>
						<div className="label-g small">New password</div>
						<input
							required
							value={newPass}
							onChange={(e) => setNewPass(e.target.value)}
							placeholder="Password"
							className="input-g"
							type="password"
						/>
						<input
							required
							value={newPassConfirm}
							onChange={(e) => setNewPassConfirm(e.target.value)}
							placeholder="Confirm password"
							className="input-g"
							type="password"
						/>
						<div className={sty.footer}>
							<button
								type="submit"
								className="btn-g primary"
								disabled={isLoading}
							>
								Confirm new password
							</button>
							<div className={sty.footerItem}>
								<small>
									<button
										type="button"
										className="link-g"
										onClick={() => onCancel()}
									>
										Back to login
									</button>
								</small>
							</div>
						</div>
					</form>
				</div>
			)}
		</div>
	)
}

ForgotPassword.propTypes = {
	onCancel: PropTypes.func.isRequired,
}

const LoginForm = (props) => {
	const { showSignUpFirst } = props
	const { appLogin } = useLogin()

	const [signUpIsOpen, showSignUp] = useState(showSignUpFirst)
	const [forgotPasswordIsOpen, showForgotPassword] = useState(false)
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const usernameInput = useRef(null)
	const login = async (e) => {
		e.preventDefault()
		appLogin(username, password, '/dashboard')
	}

	useEffect(() => {
		usernameInput.current?.focus()
	}, [])

	if (signUpIsOpen) {
		return (
			<RegisterForm isOpen={signUpIsOpen} showLogin={() => showSignUp(false)} />
		)
	}
	if (forgotPasswordIsOpen) {
		return <ForgotPassword onCancel={() => showForgotPassword(false)} />
	}

	return (
		<form onSubmit={(e) => login(e)} className={sty.container}>
			<div className="label-g small">login</div>
			<input
				required
				value={username}
				onChange={(e) => setUsername(e.target.value)}
				ref={usernameInput}
				placeholder="Username"
				className="input-g"
				type="text"
			/>
			<input
				required
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				placeholder="Password"
				className="input-g"
				type="password"
			/>
			<div className={sty.footer}>
				<button className="btn-g primary" type="submit">
					LOGIN
					<IoIosLogIn className="icon" />
				</button>
				<div className={sty.footerItem}>
					<small>
						No account?&nbsp;
						<button
							type="button"
							className="link-g"
							onClick={() => showSignUp(true)}
						>
							Create one
						</button>
					</small>
				</div>
				<div className={sty.footerItem}>
					<small>
						<button
							type="button"
							className="link-g"
							onClick={() => showForgotPassword(true)}
						>
							Forgot password?
						</button>
					</small>
				</div>
			</div>
		</form>
	)
}
LoginForm.defaultProps = {
	showSignUpFirst: false,
}
LoginForm.propTypes = {
	showSignUpFirst: PropTypes.bool,
}

export default LoginForm
export { LoginForm }
