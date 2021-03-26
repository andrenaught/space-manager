import React, { useEffect, useState, useContext } from 'react'
import { useHistory } from 'react-router-dom'
import PropTypes from 'prop-types'
import { FaUserCircle } from 'react-icons/fa'
import useFetch from 'src/components/utils/useFetch'
import { SpaceContext } from './spaceUtils'

const InvitedUsers = (props) => {
	const { id, invitedUsersIsOpen } = props
	const appFetch = useFetch()
	const [username, setUsername] = useState('')
	const [users, setUsers] = useState([])

	const getUsers = async () => {
		const { data, ok } = await appFetch(`/api/spaces/${id}/participants`)
		if (!ok) return

		setUsers(data.participants)
	}

	useEffect(() => {
		if (invitedUsersIsOpen) {
			getUsers()
		}
	}, [invitedUsersIsOpen])

	const addUser = async (e) => {
		e.preventDefault()
		const body = {
			username,
		}

		const { ok } = await appFetch(`/api/spaces/${id}/participants`, {
			method: 'POST',
			body: JSON.stringify(body),
		})
		if (!ok) return

		getUsers()
		setUsername('')
	}

	const deleteUser = async (userId) => {
		const body = {
			user_id: userId,
		}

		const { ok } = await appFetch(`/api/spaces/${id}/participants`, {
			method: 'DELETE',
			body: JSON.stringify(body),
		})
		if (!ok) return

		getUsers()
	}

	return (
		<>
			<span className="label-g">Members</span>
			<div>
				<small>Members can access this space even when it&#39;s private.</small>
			</div>
			<div style={{ margin: '5px 0px 10px 0px' }}>
				<ul>
					{users.map((user) => (
						<li
							key={user.user_id}
							style={{
								display: 'flex',
								alignItems: 'center',
								fontSize: '14px',
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									marginBottom: '1px',
									lineHeight: 0,
								}}
							>
								<FaUserCircle style={{ marginRight: '5px' }} />
								<span style={{ marginRight: '5px' }}>{user.username}</span>
								{user.invite_accepted == null && (
									<span style={{ marginTop: '1px' }}>
										<small className="faded-g" style={{ fontSize: '10px' }}>
											INVITE PENDING
										</small>
									</span>
								)}
							</div>
							{user.invite_accepted && (
								<div className="label-g">
									<button
										type="button"
										className="clickable-g danger"
										onClick={() => deleteUser(user.user_id)}
									>
										<small style={{ fontSize: '10px' }}>REMOVE</small>
									</button>
								</div>
							)}
						</li>
					))}
				</ul>
			</div>

			<form onSubmit={(e) => addUser(e)} style={{ paddingTop: '5px' }}>
				<span className="label-g small">Username</span>
				<div style={{ display: 'flex' }}>
					<input
						required
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						className="input-g small"
						style={{ marginBottom: '0px', marginRight: '5px' }}
						placeholder=""
					/>
					<button
						type="submit"
						className="btn-g primary"
						style={{ textTransform: 'capitalize' }}
					>
						Invite User
					</button>
				</div>
			</form>
		</>
	)
}

InvitedUsers.propTypes = {
	id: PropTypes.string.isRequired,
	invitedUsersIsOpen: PropTypes.bool.isRequired,
}

const SpaceDeleter = (props) => {
	const { setPendingChanges } = useContext(SpaceContext)
	const { id } = props
	const appFetch = useFetch()
	const history = useHistory()

	const [password, setPassword] = useState('')
	const [confirmerIsOpen, setConfirmerIsOpen] = useState(false)
	const confirmDelete = async (e) => {
		e.preventDefault()
		const { ok } = await appFetch(`/api/spaces/${id}`, {
			method: 'DELETE',
			body: JSON.stringify({ password }),
		})
		setPassword('')
		if (!ok) return

		setPendingChanges({})
		history.push(`/dashboard`)
	}

	return (
		<div>
			<div style={{ marginBottom: '10px' }}>
				<button
					type="button"
					disabled={confirmerIsOpen}
					onClick={() => setConfirmerIsOpen(!confirmerIsOpen)}
					className={`btn-g${!confirmerIsOpen ? ' danger' : ''}`}
				>
					Delete space
				</button>
				{confirmerIsOpen && (
					<button
						type="button"
						className="btn-g clear"
						onClick={() => setConfirmerIsOpen(false)}
						style={{ paddingLeft: '10px' }}
					>
						Cancel
					</button>
				)}
			</div>
			{confirmerIsOpen && (
				<div>
					<form onSubmit={(e) => confirmDelete(e)}>
						<div className="label-g small">password</div>
						<input
							required
							type="password"
							className="input-g small"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						<button type="submit" className="btn-g danger">
							Confirm Delete
						</button>
					</form>
				</div>
			)}
		</div>
	)
}

SpaceDeleter.propTypes = {
	id: PropTypes.string.isRequired,
}
// eslint-disable-next-line import/prefer-default-export
export { InvitedUsers, SpaceDeleter }
