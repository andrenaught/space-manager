import React from 'react'
import { Route, useRouteMatch, Switch } from 'react-router-dom'
import Space from 'src/components/space/Space'
import SpaceSearch from 'src/components/layouts/SpaceSearch'
import PrivateRoute from 'src/components/utils/PrivateRoute'
import { ErrorPage } from 'src/components/utils/ErrorPage'
import NewSpaceRedirect from './redirects/newSpace'

const AllSpaces = () => <div>all spaces</div>

const SpacePage = () => {
	const { path } = useRouteMatch()

	return (
		<Switch>
			<Route exact path="/">
				<AllSpaces />
			</Route>
			<PrivateRoute exact path={`${path}/new`}>
				<NewSpaceRedirect />
			</PrivateRoute>
			<Route exact path={`${path}/search`}>
				<SpaceSearch />
			</Route>
			<Route exact path={`${path}/:id`}>
				<Space />
			</Route>
			<Route path="*">
				<div>
					<ErrorPage code={404} />
				</div>
			</Route>
		</Switch>
	)
}

export default SpacePage
