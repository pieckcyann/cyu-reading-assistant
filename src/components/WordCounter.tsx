import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';

import { getWordCount } from '../func/WordCount';
import { useState } from 'react';
import { Notice } from 'obsidian';

interface wordCounterProps {
	className?: string;
	textContent?: string;
	title?: string;
}

const WordCounter: React.FC<wordCounterProps> = ({
	className = 'ra-count-display',
	textContent = ' ... words',
}) => {
	const [content, setContent] = useState<string>(textContent); // 使用 textContent 作为初始内容

	const handleClick = async () => {
		const newWordCount = await getWordCountOfArticle();
		setContent(newWordCount + ' words');
	};

	return (
		<span
			className={className}
			onClick={handleClick}
			aria-label="Total word count of this article, click to refresh"
		>
			{content}
		</span>
	);
};

export async function mountWordCounter(containerEl: HTMLElement) {
	// const readpage = containerEl.querySelector('.frontmatter');

	let container: HTMLHeadElement | null = null;
	const headers = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

	for (const tag of headers) {
		container = containerEl.querySelector(tag);
		if (container) break;
	}

	if (!container) return;

	const div = document.createElement('div');
	// container.parentElement?.appendChild(div);
	container.appendChild(div);
	const root = createRoot(div);

	const wordCount = await getWordCountOfArticle();

	root.render(
		<WordCounter className="ra-count-display" textContent={wordCount + ' words'} />
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
