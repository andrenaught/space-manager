/* eslint react/jsx-props-no-spreading: 0 */
// A wrapper for <Route> that redirects to the login
// screen if you're not yet authenticated.

import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import { Route, Redirect } from 'react-router-dom'
import { AuthContext } from 'src/Store'

const PrivateRoute = ({ children, ...rest }) => {
	const { accessToken } = useContext(AuthContext)
	return (
		<Route
			{...rest}
			render={({ location }) =>
				accessToken ? (
					children
				) : (
					<Redirect
						to={{
							pathname: '/login',
							state: { from: location },
						}}
					/>
				)
			}
		/>
	)
}

PrivateRoute.propTypes = {
	children: PropTypes.node.isRequired,
}

export default PrivateRoute
