import React, { useState, useEffect, useRef } from 'react'
import useFetch from 'src/components/utils/useFetch'
import { LoadMoreButton } from 'src/components/UI'
import SpaceList from './SpaceList'

const searchTypes = [
	{ slug: 'keyword', name: 'Keyword', inputType: 'text', info: '' },
	{
		slug: 'space_id',
		name: 'Space ID',
		inputType: 'number',
		info: 'Space ID can found within the URL',
	},
]
const perPage = 4
const SpaceSearch = () => {
	const [searchInput, setSearchInput] = useState('')
	const [spaces, setSpaces] = useState([])
	const [message, setMessage] = useState('')
	const [searchType, setSearchType] = useState(searchTypes[0])
	const [page, setPage] = useState(0)
	const [noMoreSpaces, setNoMoreSpaces] = useState(false)
	const [moreSpacesLoading, setMoreSpacesLoading] = useState(false)
	const searchInputRef = useRef(null)
	const appFetch = useFetch()

	const searchSpace = async (e) => {
		e.preventDefault()
		setMessage('')
		setNoMoreSpaces(false)
		const { data, ok } = await appFetch(
			`/api/spaces?search_val=${searchInput}&search_type=${searchType.slug}&per_page=${perPage}&get_summary=1`
		)
		if (!ok) return

		if (data.spaces.length === 0) {
			setSpaces([])
			setMessage(`Space not found.
				NOTE: Only public spaces are searchable.
			`)
			return
		}

		setSpaces(data.spaces)
	}

	const showMore = async () => {
		setMoreSpacesLoading(true)
		const { data, ok } = await appFetch(
			`/api/spaces?search_val=${searchInput}&search_type=${
				searchType.slug
			}&page=${page + 1}&per_page=${perPage}&get_summary=1`
		)
		if (!ok) return

		if (data.spaces.length === 0) {
			setNoMoreSpaces(true)
		}

		setPage(page + 1)
		setSpaces([...spaces, ...data.spaces])
		setMoreSpacesLoading(false)
	}

	useEffect(() => {
		setSearchInput('')
		setSpaces([])
	}, [searchType])

	useEffect(() => {
		searchInputRef.current.focus()
	}, [])

	return (
		<div className="container-g" style={{ padding: '50px 0px' }}>
			<div className="row centered">
				<div style={{ width: '500px', maxWidth: '100%' }}>
					<div>
						<div className="label-g small">search by</div>
						<div style={{ display: 'flex', alignItems: 'center' }}>
							{searchTypes.map((type) => (
								<button
									type="button"
									key={type.slug}
									className="btn-g small"
									disabled={type.slug === searchType.slug}
									onClick={() => {
										setSearchType(type)
									}}
								>
									{type.name}
								</button>
							))}
						</div>
					</div>
					<p style={{ margin: '5px 0px 10px 0px' }}>
						<small>{searchType.info}</small>
					</p>
					<form
						onSubmit={(e) => searchSpace(e)}
						style={{ textAlign: 'center', marginBottom: '20px' }}
					>
						<div style={{ display: 'flex', alignItems: 'center' }}>
							<input
								placeholder={searchType.name}
								ref={searchInputRef}
								onFocus={() => {
									searchInputRef.current.select()
								}}
								className="input-g small no-marg"
								style={{ marginRight: '5px' }}
								required
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								type={searchType.inputType}
							/>
							<button type="submit" className="btn-g primary">
								Search
							</button>
						</div>
					</form>
					<SpaceList
						spaces={spaces || []}
						hasSummary
						showSummary
						refreshData={() => {}}
					/>
					{!noMoreSpaces &&
						spaces.length !== 0 &&
						searchType.slug !== 'space_id' && (
							<div style={{ display: 'flex', justifyContent: 'center' }}>
								<LoadMoreButton
									onClick={() => showMore()}
									disabled={moreSpacesLoading}
									isLoading={moreSpacesLoading}
								>
									Show more
								</LoadMoreButton>
							</div>
						)}
					<p>
						<small style={{ whiteSpace: 'pre-line' }}>{message}</small>
					</p>
					{spaces.length === 0 && <div style={{ height: '15px' }} />}
					<SpaceExplore />
				</div>
			</div>
		</div>
	)
}

const SpaceExplore = () => {
	const appFetch = useFetch()
	const [spaces, setSpaces] = useState([])
	const getSpaces = async () => {
		const { data, ok } = await appFetch(`/api/spaces/custom/featured`)
		if (!ok) return

		setSpaces(data.spaces)
	}

	useEffect(() => {
		getSpaces()
	})

	if (spaces.length === 0) return null
	return (
		<div>
			<div
				className="label-g"
				style={{
					margin: '15px 0px 15px 0px',
					padding: '10px',
					justifyContent: 'center',
					background: '#555',
					color: '#fff',
					borderRadius: '3px',
				}}
			>
				Featured Spaces
			</div>
			<SpaceList
				spaces={spaces}
				hasSummary
				showSummary={false}
				refreshData={() => {}}
			/>
		</div>
	)
}

export default SpaceSearch
