import React, { useContext } from 'react'
import { Redirect } from 'react-router-dom'
import { LoginForm } from 'src/components/user/Login'
import { AuthContext } from 'src/Store'

const LoginPage = () => {
	const { accessToken } = useContext(AuthContext)

	if (accessToken) return <Redirect to="/dashboard" />
	return (
		<div className="content-section-g screen-centered">
			<LoginForm />
		</div>
	)
}

export default LoginPage
export { LoginPage }
