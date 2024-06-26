import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';

import { getWordCount } from '../func/WordCount';

interface wordCounterProps {
	className?: string;
	textContent?: string;
	title?: string;
}

const WordCounter: React.FC<wordCounterProps> = ({
	className = 'ra-count-display',
	textContent = ' ... words',
}) => {
	return <span className={className}>{textContent}</span>;
};

export async function mountWordCounter(containerEl: HTMLElement) {
	const readpage = containerEl.querySelector('.frontmatter');
	if (!readpage) return;

	const div = document.createElement('div');
	readpage.parentElement?.appendChild(div);
	const root = createRoot(div);

	const wordCount = await getWordCountOfArticle();

	root.render(
		<React.StrictMode>
			<WordCounter
				className="ra-count-display"
				textContent={wordCount + ' words'}
				title="this a msg."
			/>
		</React.StrictMode>
	);
}

export function unmountWordCounter(container: HTMLElement) {
	// const div = container.querySelector('.reading h1 > div');
	const div = container.querySelector('.frontmatter');

	if (div instanceof Element) {
		ReactDOM.unmountComponentAtNode(div);
	}
}

async function getWordCountOfArticle(): Promise<number> {
	const extractArticle = (input: string): string | null => {
		const regex = /^#{1,6}\s+(.+?)(?=\n\n(?:^#{1}\s+|$))/ms;
		const match = input.match(regex);
		return match ? match[1] : null;
	};

	// replace htmltags、![]()
	const escapeHtmlString = (input: string): string => {
		return input.replace(/<[^>]*>/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '');
	};

	const file = this.app.workspace.getActiveFile();
	if (!file) return 0;

	const fileContent = await this.app.vault.read(file);
	const articleContent = extractArticle(fileContent);
	if (!articleContent) return 0;

	const numberOfWord = getWordCount(escapeHtmlString(articleContent));
	return numberOfWord;
}
