/* eslint-disable @typescript-eslint/no-unused-vars */
import ReadAssistPlugin, { RowData } from 'main';
import { MarkdownView, Notice } from 'obsidian';
import { ReadAssistPluginSettings } from 'settings/Settings';

import React, { useRef, useEffect, useState } from 'react';
import { WordComparator } from 'func/WordMarkCheck';
import { parseAllComments } from 'func/ParseComment';

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
			onClickHandle(plugin, line, word, meaning);
		}}
	>
		<div className={`word-column${isMarked ? ' ra-star' : ''}`}>{word}</div>
		<div className={`symbol-column`}>-&gt;</div>
		<div className={`meaning-column`}>{meaning}</div>
	</div>
);

const onClickHandle = (
	plugin: ReadAssistPlugin,
	line: number,
	wordOfLabel: string,
	meaningOfLabel: string
) => {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (view == null) return;

	const scrollToPosition = line;
	const state = { scroll: scrollToPosition - 1 };
	view.setEphemeralState(state);

	parseAllComments(
		view.containerEl,
		(label: HTMLElement, word: string, meaning: string) => {
			if (wordOfLabel == word && meaningOfLabel == meaning) {
				label.style.backgroundColor = 'aqua';

				setTimeout(() => {
					label.style.backgroundColor = '';
				}, 1000);

				return;
			}
		}
	);
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

export const getScrollTopWrapper = async (Plugin: ReadAssistPlugin): Promise<number> => {
	const wrapperRef = Plugin.app.workspace
		.getActiveViewOfType(MarkdownView)
		?.containerEl.querySelector('.flash-card-wrapper') as HTMLDivElement | null;

	if (wrapperRef) {
		return wrapperRef.scrollTop;
	}

	return 0; // Return a default value if wrapperRef is null
};

export const setScrollTopWrapper = (Plugin: ReadAssistPlugin, newValue: number) => {
	const wrapperRef = Plugin.app.workspace
		.getActiveViewOfType(MarkdownView)
		?.containerEl.find('.flash-card-wrapper') as HTMLDivElement | null;

	if (wrapperRef) {
		wrapperRef.scrollTop = newValue;
	}
};

const Wrapper = ({
	plugin,
	children,
}: {
	plugin: ReadAssistPlugin;
	children: React.ReactNode;
}) => (
	<div
		// className="flash-card-wrapper"
		className={`flash-card-wrapper${plugin.settings.is_show_word_list ? '' : ' hide'}`}
		// onMouseEnter={() => console.log('Mouse entered')}
		// onMouseLeave={() => console.log('Mouse left')}
	>
		{children}
	</div>
);

export function createWrapper(
	Plugin: ReadAssistPlugin,
	leaf: MarkdownView,
	datasMap: RowData[]
) {
	const wrapper = leaf.containerEl.find('.flash-card-wrapper');
	if (wrapper == null) return null;

	const listItems: React.ReactNode[] = [];
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

	return <Wrapper plugin={Plugin}>{listItems}</Wrapper>;
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
