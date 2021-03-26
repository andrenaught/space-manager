import React, { useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import useFetch from 'src/components/utils/useFetch'
import { AuthContext } from 'src/Store'
import SpaceList from 'src/components/layouts/SpaceList'
import { LoadMoreButton } from 'src/components/UI'

const spaceGroups = [
	{ slug: 'owned', type: 'owned', name: 'Owned' },
	{
		slug: 'shared',
		type: 'shared',
		name: 'Invited',
		description: "Spaces that you've been invited to.",
	},
	{
		slug: 'saved',
		type: 'saved',
		name: 'Saved',
	},
]
const defaultSpaceGroup = spaceGroups[0]
const DashboardPage = () => {
	const appFetch = useFetch()
	const { user } = useContext(AuthContext)
	const [spaces, setSpaces] = useState([])
	const [spaceGroup, setSpaceGroup] = useState(defaultSpaceGroup)
	const [reachedLastPage, setReachedLastPage] = useState(true)
	const [page, setPage] = useState(0)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [isLoadingSpaces, setIsLoadingSpaces] = useState(false)

	const getSpaces = async () => {
		const { data, ok } = await appFetch(`/api/me/spaces/${spaceGroup.slug}`)
		if (!ok) return

		setSpaces(data.spaces)
		setIsLoadingSpaces(false)
		if (data.spaces.length >= data.per_page) {
			setReachedLastPage(false)
		}
	}

	const loadMore = async () => {
		setIsLoadingMore(true)
		const { data, ok } = await appFetch(
			`/api/me/spaces/${spaceGroup.slug}?page=${page + 1}`
		)
		if (!ok) return

		if (data.spaces.length === 0) {
			setReachedLastPage(true)
		} else {
			setPage(page + 1)
		}
		setIsLoadingMore(false)
		setSpaces([...spaces, ...data.spaces])
		if (data.spaces.length >= data.per_page) {
			setReachedLastPage(false)
		}
	}
	const refresh = () => {
		setPage(0)
		setReachedLastPage(true)
		getSpaces()
	}

	useEffect(() => {
		setPage(0)
		setReachedLastPage(true)
		getSpaces()
	}, [spaceGroup])

	return (
		<div className="container-g">
			<div className="row centered">
				<div
					style={{
						width: '500px',
						marginTop: '50px',
						marginBottom: '50px',
						maxWidth: '100%',
					}}
				>
					{user && !user.email_is_verified && (
						<div className="info-g warn">
							<h4>Email is not verified</h4>
							<p>
								Consider adding an email address for account recovery, in case
								you forget your username or password.&nbsp;
								<Link to="user" className="link-g">
									Add email
								</Link>
							</p>
						</div>
					)}
					<h2>Spaces</h2>
					<div className="spaced-out-g reversed-m">
						<div className="tab-list-g">
							{spaceGroups.map((group) => {
								const active = group.slug === spaceGroup.slug ? 'active' : ''
								return (
									<button
										type="button"
										key={group.slug}
										className={active}
										style={{ marginRight: '15px' }}
										onClick={() => {
											setIsLoadingSpaces(true)
											setSpaceGroup(group)
										}}
									>
										{group.name}
									</button>
								)
							})}
						</div>
						<div style={{ display: 'flex' }}>
							<Link to="spaces/search" style={{ marginRight: '10px' }}>
								<button type="button" className="btn-g no-marg">
									SEARCH
								</button>
							</Link>
							<Link to="spaces/new">
								<button type="button" className="btn-g primary no-marg">
									CREATE
								</button>
							</Link>
						</div>
					</div>
					{spaceGroup.description && (
						<p>
							<small>{spaceGroup.description}</small>
						</p>
					)}
					{!isLoadingSpaces && (
						<>
							<SpaceList
								spaces={spaces || []}
								type={spaceGroup.type}
								refreshData={getSpaces}
							/>
							{!reachedLastPage && (
								<LoadMoreButton
									isLoading={isLoadingMore}
									onClick={() => loadMore()}
								>
									More
								</LoadMoreButton>
							)}
							{spaceGroup.type === 'shared' && (
								<Invites onInviteAnswer={refresh} />
							)}
						</>
					)}
				</div>
			</div>
		</div>
	)
}

const Invites = (props) => {
	const appFetch = useFetch()
	const { onInviteAnswer } = props
	const [invites, setInvites] = useState([])
	const [reachedLastPage, setReachedLastPage] = useState(true)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [page, setPage] = useState(0)

	const getInvites = async () => {
		const { data, ok } = await appFetch(
			`/api/me/spaces/shared?invite_status=pending`
		)
		if (!ok) return

		setInvites(data.spaces)
		if (data.spaces.length >= data.per_page) {
			setReachedLastPage(false)
		}
	}
	const loadMore = async () => {
		setIsLoadingMore(true)
		const { data, ok } = await appFetch(
			`/api/me/spaces/shared?invite_status=pending&page=${page + 1}`
		)
		if (!ok) return

		if (data.spaces.length === 0) {
			setReachedLastPage(true)
		} else {
			setPage(page + 1)
		}
		setIsLoadingMore(false)
		setInvites([...invites, ...data.spaces])
		if (data.spaces.length >= data.per_page) {
			setReachedLastPage(false)
		}
	}

	const refresh = () => {
		setPage(0)
		setReachedLastPage(true)
		getInvites()
	}

	useEffect(() => {
		getInvites()
	}, [])

	return (
		<div>
			<SpaceList
				spaces={invites || []}
				type="shared"
				onInviteAnswer={() => {
					onInviteAnswer()
					refresh()
				}}
			/>
			{!reachedLastPage && (
				<LoadMoreButton isLoading={isLoadingMore} onClick={() => loadMore()}>
					More
				</LoadMoreButton>
			)}
		</div>
	)
}
Invites.propTypes = {
	onInviteAnswer: PropTypes.func,
}
Invites.defaultProps = {
	onInviteAnswer: () => {},
}

export { DashboardPage }
export default DashboardPage
