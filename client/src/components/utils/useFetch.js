import { aTokenKey, rTokenKey } from 'src/Store'

const useHandleResponse = () => {
	const handleResponse = (response) => {
		if (!response) return false
		const code = response.status
		if (code !== 200) {
			console.error(response.statusText)
			return false
		}
		return true
	}

	return handleResponse
}

const preFetch = (fetchParams) => {
	const aToken = localStorage.getItem(aTokenKey)
	const rToken = localStorage.getItem(rTokenKey)

	const defaultFetchHeaders = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${aToken}`,
		'x-r-token': rToken,
	}

	const paramsToUse = {
		...fetchParams,
		headers: { ...defaultFetchHeaders, ...fetchParams?.headers },
	}

	return { paramsToUse }
}

const postFetch = (response, ok, message) => {
	const newAToken = response.headers.get('x-a-token')
	const newRToken = response.headers.get('x-r-token')
	if (newAToken) localStorage.setItem(aTokenKey, newAToken)
	if (newRToken) localStorage.setItem(rTokenKey, newRToken)
	if (!ok) {
		alert(message || response.statusText)
	}
}

const useFetch = () => {
	const handleResponse = useHandleResponse()
	const appFetch = async (endpoint, fetchParams) => {
		const { paramsToUse } = preFetch(fetchParams)

		// start fetch
		const response = await fetch(endpoint, paramsToUse)
		const ok = handleResponse(response)
		const data = await response.json()
		// end fetch

		postFetch(response, ok, data.message)
		return { data, response, ok }
	}

	return appFetch
}

// does not use useHandleResponse (which contains useHistory, which cannot be used in App.js)
const useSimpleFetch = () => {
	const simpleFetch = async (endpoint, fetchParams) => {
		const { paramsToUse } = preFetch(fetchParams)

		// start fetch
		const response = await fetch(endpoint, paramsToUse)
		const data = await response.json()
		// end fetch

		return { data, response }
	}

	return simpleFetch
}

export default useFetch
export { useHandleResponse, useSimpleFetch }
