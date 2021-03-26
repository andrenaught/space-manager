import React, { useContext, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import './styles/_app.scss'
import {
	BrowserRouter as Router,
	Switch,
	Route,
	NavLink,
	Link,
	useHistory,
	useLocation,
} from 'react-router-dom'
import PrivateRoute from './components/utils/PrivateRoute'
import {
	LogoSVG,
	CircledProfileIcon,
	CircledInfoIcon,
} from './components/assets/svg'
import { ErrorPage } from './components/utils/ErrorPage'
import { useSimpleFetch } from './components/utils/useFetch'

// Contexts
import { AuthContext, rTokenKey, aTokenKey } from './Store'

// Pages
import Index from './pages/index'
import Space from './pages/spaces'
import Docs from './pages/docs/index'
import { UserPage } from './pages/user'
import { LoginPage } from './pages/login'
import { DashboardPage } from './pages/dashboard'

const Header = (props) => {
	const { isLoggedIn, user } = props
	const history = useHistory()
	const location = useLocation()
	const [noHover, setNoHover] = useState(false)

	useEffect(() => {
		setNoHover(true)
	}, [location])

	let classList = ''
	if (isLoggedIn) classList += ' is-logged-in'
	if (noHover) classList += ' no-hover'

	return (
		<header
			className={`app-header${classList}`}
			onMouseEnter={() => setNoHover(false)}
			onTouchStart={() => setNoHover(false)}
		>
			<div className="container-g">
				<nav className="app-nav row">
					<NavLink
						to={`${isLoggedIn ? '/dashboard' : '/'}`}
						className="nav-link"
						style={{ paddingLeft: '0px' }}
					>
						<LogoSVG />
					</NavLink>
					<ul className="nav-list">
						{isLoggedIn ? (
							<>
								<li className="nav-item">
									<div className="nav-link">
										<CircledInfoIcon className="icon-g" />
									</div>
									<div className="dropdown-item stick-right">
										<div className="content">
											<Link to="/" className="nav-link">
												Homepage
											</Link>
											<Link to="/docs" className="nav-link">
												Docs
											</Link>
										</div>
									</div>
								</li>
								<li className="nav-item">
									<div className="nav-link">
										<CircledProfileIcon className="icon-g" />
									</div>
									<div className="dropdown-item stick-right">
										<div className="content">
											<Link to='/user' className='nav-link maxed-length'>
												{user?.username}
											</Link>
											<button
												type="button"
												className="nav-link"
												onClick={() => history.push('/logout')}
											>
												Logout
											</button>
										</div>
									</div>
								</li>
							</>
						) : (
							<li className="nav-item">
								<NavLink
									to="/login"
									className="nav-link"
									activeClassName="is-active"
								>
									LOGIN
								</NavLink>
							</li>
						)}
					</ul>
				</nav>
			</div>
		</header>
	)
}

const Logout = () => {
	const history = useHistory()
	const { setAccessToken, setRefreshToken, setUser } = useContext(AuthContext)
	useEffect(() => {
		setAccessToken(null)
		setRefreshToken(null)
		setUser(null)
		localStorage.removeItem(aTokenKey)
		localStorage.removeItem(rTokenKey)
		history.replace('/login')
	}, [])

	return null
}

Header.propTypes = {
	isLoggedIn: PropTypes.bool.isRequired,
	user: PropTypes.shape({
		username: PropTypes.string,
	}).isRequired,
}

const Init = ({ isLoggedIn, userNotFound }) => {
	const history = useHistory()
	const { pathname } = useLocation()
	useEffect(() => {
		// if their arrival route is homepage
		if (pathname === '/' && isLoggedIn) {
			history.replace('/dashboard')
		}
	}, [])
	useEffect(() => {
		// if user not found
		if (userNotFound) {
			history.replace('/logout')
		}
	}, [userNotFound])
	return null
}

const App = () => {
	const simpleFetch = useSimpleFetch()
	const { accessToken, setUser, user } = useContext(AuthContext)
	const isLoggedIn = Boolean(accessToken)
	const [userNotFound, setUserNotFound] = useState(false)

	useEffect(() => {
		const getUser = async () => {
			if (!accessToken) return null
			const { data, response } = await simpleFetch('/api/me')
			if (response.status !== 200) {
				setUserNotFound(true)
				return false
			}
			setUser(data.user)
			return true
		}
		getUser()
	}, [])

	return (
		<Router>
			<Init isLoggedIn={isLoggedIn} userNotFound={userNotFound} />
			<Header isLoggedIn={isLoggedIn} user={user || {}} logoutFunc={() => {}} />
			<div className="app-body">
				<Switch>
					<Route exact path="/">
						<Index isLoggedIn={isLoggedIn} />
					</Route>
					<Route path="/spaces" component={Space} />
					<PrivateRoute path="/user">
						<UserPage />
					</PrivateRoute>
					<Route path="/login" component={LoginPage} />
					<Route path="/logout" component={Logout} />
					<PrivateRoute path="/dashboard">
						<DashboardPage />
					</PrivateRoute>
					<Route path="/docs" component={Docs} />
					<Route component={ErrorPage} />
				</Switch>
			</div>
			<Footer />
		</Router>
	)
}

const Footer = () => (
	<footer className="app-footer">
		<div className="container-g">
			<div className="row">
				{process.env.REACT_APP_CONTACT_URL ? (
					<a
						href={process.env.REACT_APP_CONTACT_URL}
						target="_blank"
						rel="noreferrer"
					>
						<small>Contact Info</small>
					</a>
				) : (
					<small>&nbsp;</small>
				)}
			</div>
		</div>
	</footer>
)

export default App
