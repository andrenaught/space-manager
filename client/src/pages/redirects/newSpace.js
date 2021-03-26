import React, { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import useFetch from 'src/components/utils/useFetch'
import {
	convertObjectToFrontend,
	convertObjectToDB,
} from 'src/components/space/spaceUtils'

const NewSpaceRedirect = () => {
	const history = useHistory()
	const appFetch = useFetch()

	useEffect(() => {
		const createGrid = async () => {
			const defaultKitFetch = await appFetch(`/api/objects/default_kit`)
			if (!defaultKitFetch.ok) return false
			let objectKit = defaultKitFetch.data.objects
			objectKit = convertObjectToFrontend(objectKit)
			objectKit = convertObjectToDB(objectKit)

			const { data, ok } = await appFetch('/api/spaces', {
				method: 'POST',
				body: JSON.stringify({
					grid: null,
					grid_values: null,
					objects: objectKit,
				}),
			})
			if (!ok) return false
			return data.space.id
		}
		const createSpaceInDB = async () => {
			// create in db
			const id = await createGrid()
			if (!id) return
			history.replace(`/spaces/${id}`)
		}
		createSpaceInDB()
	}, [])

	return (
		<div className="content-section-g screen-centered">
			Creating new space.....
		</div>
	)
}

export default NewSpaceRedirect
