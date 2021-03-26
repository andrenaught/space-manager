import React, { useState } from 'react'
import PropTypes from 'prop-types'

export const AuthContext = React.createContext()
export const aTokenKey = 'aToken'
export const rTokenKey = 'rToken'

const Store = ({ children }) => {
	// Auth
	const [accessToken, setAccessToken] = useState(
		window.localStorage.getItem(aTokenKey) || null
	)
	const [refreshToken, setRefreshToken] = useState(
		window.localStorage.getItem(rTokenKey) || null
	)
	const [user, setUser] = useState(null)
	const isLoggedIn = Boolean(accessToken)

	return (
		<AuthContext.Provider
			value={{
				accessToken,
				setAccessToken,
				refreshToken,
				setRefreshToken,
				setUser,
				user,
				isLoggedIn,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

Store.propTypes = {
	children: PropTypes.node.isRequired,
}

export default Store
