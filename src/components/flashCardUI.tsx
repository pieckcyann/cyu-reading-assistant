import ReadAssistPlugin, { RowData } from 'main';
import { MarkdownView } from 'obsidian';
import { ReadAssistPluginSettings } from 'settings/Settings';

import React, { ReactNode } from 'react';
import { WordChecker } from 'func/WordMarkCheck';

const Row = ({
	word,
	meaning,
	isSentence,
	isMarked,
}: {
	word: string;
	meaning: string;
	isSentence: boolean;
	isMarked: boolean;
}) => (
	<div className={`row${isSentence ? ' sentence' : ''}`}>
		<div className={`word-column${isMarked ? ' ra-star' : ''}`}>{word}</div>
		<div className="symbol-column">-&gt;</div>
		<div className="meaning-column">{meaning}</div>
	</div>
);

// export function createRow(word: string, meaning: string): React.ReactElement {
// 	return <Row word={word} meaning={meaning} />;
// }

export function createTopDiv(container: HTMLElement) {
	const flashCardDiv = createEl('div');
	flashCardDiv.addClass('flash-card-div');
	flashCardDiv.addClass('floating-right');

	const flashCardWrapper = createEl('div');
	flashCardWrapper.addClass('flash-card-wrapper');

	flashCardDiv.appendChild(flashCardWrapper);

	container
		?.querySelector('.markdown-source-view')
		?.insertAdjacentElement('beforebegin', flashCardDiv);
}

const Wrapper = ({
	settings,
	children,
}: {
	settings?: ReadAssistPluginSettings;
	children?: React.ReactNode;
}) => {
	return (
		<div
			className="flash-card-wrapper"
			onMouseEnter={() => console.log('Mouse entered')}
			onMouseLeave={() => console.log('Mouse left')}
		>
			{children}
		</div>
	);
};
export async function createWrapper(
	Plugin: ReadAssistPlugin,
	leaf: MarkdownView,
	datasMap: RowData[]
) {
	const wrapper = leaf.containerEl.find('.flash-card-wrapper');
	if (wrapper == null) return null; // 如果 wrapper 为 null，则返回 null

	const listItems: ReactNode[] = [];
	for (const data of datasMap) {
		const isMarked = await WordChecker(
			Plugin.app,
			Plugin.pathToWordSets,
			data.word
		);

		listItems.push(
			<Row
				key={data.word}
				word={data.word}
				meaning={data.meaning}
				isSentence={data.isSentence}
				isMarked={isMarked != null}
			/>
		);
	}

	return <Wrapper>{listItems}</Wrapper>;
}

export function removeRow(container: HTMLElement) {
	// 移除所有子元素
	while (container.firstChild) {
		container.removeChild(container.firstChild);
	}

	// 移除自身
	if (container.parentNode) {
		container.parentNode.removeChild(container);
	}

	// container.innerHTML = '';
}
