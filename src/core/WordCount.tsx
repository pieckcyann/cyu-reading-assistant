import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { ReactView } from '../components/ReactView'
import { createRoot } from 'react-dom/client'

import { getWordCount } from './GetWordCount'

export async function mountWordCounter(container: HTMLElement) {
	const readpage = container.find('.reading h1, .reading h2')
	const div = document.createElement('div')
	readpage.appendChild(div)
	const root = createRoot(div)

	const wordCount = await getWordCountOfArticle()

	root.render(
		<React.StrictMode>
			<ReactView className="ra-count-display" textContent={wordCount + ' words'} />
		</React.StrictMode>
	)
}

export function unmountWordCounter(container: HTMLElement) {
	const div = container.querySelector('.reading h1 > div')
	if (div instanceof Element) {
		ReactDOM.unmountComponentAtNode(div)
	}
}

async function getWordCountOfArticle(): Promise<number> {
	const extractArticle = (input: string): string | null => {
		const regex = /^#{1,6}\s+(.+?)(?=\n\n(?:^#{1}\s+|$))/ms
		const match = input.match(regex)
		return match ? match[1] : null
	}

	// replace htmltags、![]()
	const escapeHtmlString = (input: string): string => {
		return input.replace(/<[^>]*>/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
	}

	const file = this.app.workspace.getActiveFile()
	if (!file) return 0

	const fileContent = await this.app.vault.read(file)
	const articleContent = extractArticle(fileContent)
	if (!articleContent) return 0

	const numberOfWord = getWordCount(escapeHtmlString(articleContent))

	return numberOfWord
}
