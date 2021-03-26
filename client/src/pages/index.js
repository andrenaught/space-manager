import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { LoginForm } from 'src/components/user/Login'

const IndexPage = (props) => {
	const { isLoggedIn } = props
	const [loginIsOpen, showLogin] = useState(false)
	const loginRef = useRef(null)

	const handleClick = (e) => {
		if (loginRef.current?.contains(e.target)) return

		// Handle outside click
		showLogin(false)
	}
	useEffect(() => {
		document.addEventListener('mousedown', handleClick, false)
		return () => {
			document.removeEventListener('mousedown', handleClick, false)
		}
	}, [])
	return (
		<div className="container-g">
			<div
				className="row content-section-g screen-centered"
				style={{
					backgroundImage: `url('/static/assets/index/hero.png')`,
				}}
			>
				<ul className="btn-stack-g">
					<li>
						<Link to="/spaces/search" className="btn btn-g big">
							SEARCH
						</Link>
						<div className="tooltip" style={{ width: '175px' }}>
							<div>Find a space created by other people</div>
						</div>
					</li>
					{isLoggedIn && (
						<li>
							<Link to="/dashboard" className="btn primary btn-g big">
								START
							</Link>
							<div className="tooltip" style={{ width: '175px' }}>
								<div>Back to app</div>
							</div>
						</li>
					)}
					{!isLoggedIn && (
						<li ref={loginRef}>
							<button
								type="button"
								className="btn btn-g primary big"
								onClick={() => showLogin(!loginIsOpen)}
							>
								OPEN
							</button>
							<div className="tooltip" style={{ width: '160px' }}>
								<div> space manager</div>
							</div>
							{loginIsOpen && (
								<div className="btn-click-content">
									<LoginForm redirectTo="/dashboard" />
								</div>
							)}
						</li>
					)}
				</ul>
			</div>

			<div
				className="content-g font-normal-g"
				style={{
					marginTop: '50px',
					marginBottom: '50px',
					maxWidth: '100%',
					width: '500px',
				}}
			>
				<section>
					<h3>About</h3>
					<div>
						Display the positioning and status of objects within a given space.
						<div className="faded-g" style={{ marginTop: '2px' }}>
							The goal is to create something like a live map to visually communicate
							what&apos;s happening - whether it&apos;s to share with other
							people or for personal reference.
						</div>
					</div>
					<h4 style={{ marginTop: '10px' }}>Examples</h4>
					<ul>
						<li>Parking Lot - show which parking spots are open</li>
						<li>
							Laundromat - show which washing machines are being used and how
							much time is left
						</li>
						<li>
							Seating - show which seats are taken, as well as the name of the
							person for each seat
						</li>
					</ul>
					<div className="faded-g" style={{ marginTop: '10px' }}>
						Keep in mind that you can use this however you want and that
						you&apos;re not limited to these examples.
					</div>
				</section>

				<section>
					<h3>Instructions</h3>
					<ol>
						<li>
							<span>Create a</span>
							<strong> space</strong>
						</li>
						<li>Setup permissions</li>
						<li>Set the name & description</li>
						<li>Setup & place the objects on the grid</li>
						<li>Share the link</li>
					</ol>

					<h3>Features</h3>
					<ul>
						<li>
							Custom fields & visual states for objects to provide
							customizability.
							<div className="faded-g" style={{ marginTop: '2px' }}>
								If there are no objects that fit your use case, you can use the
								generic objects. More objects can also be added by the
								maintainer to account for more use cases.
							</div>
						</li>
						<li>
							The API allows space owners to automatically update the state of
							their objects based on what is actually happening.
							<div className="faded-g" style={{ marginTop: '2px' }}>
								ex: Having parking lot sensors automatically update the
								availability status of the parking spots on the grid.
							</div>
						</li>
						<li>Permissions settings to control the space.</li>
					</ul>
				</section>

				<section>
					<h3>Use case examples</h3>
					<ul>
						<li>
							As an owner of a laundromat I can share the link to my customers
							and show the current availability and time left status on my
							washing machines and dryers. I can automatically update the status
							of those machines by using the API.
						</li>
						<li>
							As someone who goes to the laundromat I can create my own version
							of it, for my own use or to share with another person to easily
							hand off work to them.
						</li>
						<li>
							As someone planning an event, I can share with guests the seating
							setup and show whose sitting where.
						</li>
					</ul>
				</section>
			</div>
		</div>
	)
}

IndexPage.propTypes = {
	isLoggedIn: PropTypes.bool.isRequired,
}

export default IndexPage
