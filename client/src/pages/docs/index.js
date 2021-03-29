// If need more pages for this doc page, should just use a doc builder like docz
import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

// eslint-disable-next-line import/no-unresolved, import/no-webpack-loader-syntax
import DocsAPIMD from '!!raw-loader!./docsAPI.md' // importing like this so we don't have to eject from cra
// eslint-disable-next-line import/no-unresolved, import/no-webpack-loader-syntax
import DocsManualMD from '!!raw-loader!./docsManual.md'

const renderers = {
	code: (info) => {
		const { language, value } = info
		return (
			<div>
				<SyntaxHighlighter language={language} wrapLongLines>
					{value}
				</SyntaxHighlighter>
			</div>
		)
	},
}

const DocsPage = () => (
	<div className="container-g">
		<div
			className="font-normal-g content-g"
			style={{ width: '600px', maxWidth: '100%', margin: '50px auto' }}
		>
			<h1 style={{ marginBottom: '5px' }}>Documentation</h1>
			<div style={{}}>
				<a className="link-g" href="#manual">
					Manual
				</a>
				&nbsp;-&nbsp;
				<a className="link-g" href="#api">
					API
				</a>
			</div>
			<h2
				id="manual"
				style={{
					marginBottom: '15px',
					marginTop: '15px',
					textDecoration: 'underline',
				}}
			>
				Manual
			</h2>
			<ReactMarkdown renderers={renderers}>{DocsManualMD}</ReactMarkdown>
			<div className="separator-g strong" />
			<h2
				id="api"
				style={{
					marginBottom: '15px',
					marginTop: '15px',
					textDecoration: 'underline',
				}}
			>
				API
			</h2>
			<div>
				<strong>API URL: </strong>
				<span
					style={{
						background: '#f5f2f0',
						color: '#000',
						display: 'inline-block',
						padding: '4px 8px',
						borderRadius: '2px',
					}}
				>
					{`${window.location.origin}/api/v1`}
				</span>
			</div>
			<ReactMarkdown renderers={renderers}>{DocsAPIMD}</ReactMarkdown>
		</div>
	</div>
)

export default DocsPage
