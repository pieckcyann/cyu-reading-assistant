import ReadAssistPlugin, { RowData } from 'main';
import { MarkdownView } from 'obsidian';
import { ReadAssistPluginSettings } from 'settings/Settings';

import React, { ReactNode } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WordComparator } from 'func/WordMarkCheck';

const Row = ({
	plugin,
	word,
	meaning,
	line,
	isSentence,
	isMarked,
}: {
	plugin: ReadAssistPlugin;
	word: string;
	meaning: string;
	line: number;
	isSentence: boolean;
	isMarked: boolean;
}) => (
	<div
		className={`row${isSentence ? ' sentence' : ''}`}
		onClick={() => {
			onClickHandle(plugin, line, word);
		}}
	>
		<div className={`word-column${isMarked ? ' ra-star' : ''}`}>{word}</div>
		<div className="symbol-column">-&gt;</div>
		<div className="meaning-column">{meaning}</div>
	</div>
);

const onClickHandle = (
	plugin: ReadAssistPlugin,
	line: number,
	word: string
) => {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (view == null) return;

	const labels = view.containerEl.findAll('label');
	for (const label of labels) {
		// don't highlight sentences
		if (!label.classList.contains('sentence')) {
			let wordOfLabel = label.textContent?.replace(/<[^>]+>/g, '') ?? '';
			const del = label.find('del');
			if (del) {
				wordOfLabel = del.getAttribute('data-prototype') ?? '';
			}

			if (wordOfLabel.contains(word)) {
				// label.addClass('located');
				label.style.backgroundColor = 'aqua';

				// Remove the background-color after two seconds
				setTimeout(() => {
					// label.removeClass('located');
					label.style.backgroundColor = '';
				}, 2000);
			}
		}
	}

	const scrollToPosition = line;
	const state = { scroll: scrollToPosition - 1 };
	view.setEphemeralState(state);
};

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
export function createWrapper(
	Plugin: ReadAssistPlugin,
	leaf: MarkdownView,
	datasMap: RowData[]
) {
	const wrapper = leaf.containerEl.find('.flash-card-wrapper');
	if (wrapper == null) return null;

	const listItems: ReactNode[] = [];
	for (const data of datasMap) {
		const isMarked = WordComparator(Plugin.settings.word_sets_data, data.word);

		listItems.push(
			<Row
				plugin={Plugin}
				key={data.word + data.meaning}
				word={data.word}
				meaning={data.meaning}
				line={data.line}
				isSentence={data.isSentence}
				isMarked={isMarked}
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
