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
		<div className={`meaning-column`}>
			{meaning.replace(/((?:\/[^/]*\/|\[[^\]]*\])[^\\/\\[\]]*?)(?=\/|\[|$)/g, '\n$1')}
		</div>
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

	// new Notice(wordOfLabel);
	// new Notice(meaningOfLabel);

	parseAllComments(
		view.containerEl,
		(label: HTMLElement, word: string, meaning: string) => {
			if (wordOfLabel === word && meaningOfLabel === meaning) {
				label.style.backgroundColor = 'aqua';

				setTimeout(() => {
					label.style.backgroundColor = '';
				}, 1000);

				return;
			}
			// else if (label.classList.contains('sentence') && wordOfLabel != word) {
			// 	console.log(wordOfLabel);
			// 	console.log(word);
			// }
			// else if (label.classList.contains('sentence') && meaningOfLabel != meaning) {
			// 	new Notice(meaningOfLabel);
			// 	new Notice(meaning);
			// }
			else if (
				label.classList.contains('sentence') &&
				wordOfLabel.startsWith('Avoid') &&
				wordOfLabel != word
			) {
				console.log(`[wordOfLabel]: ${wordOfLabel}`);
				console.log(`[word]: ${word}`);

				// const diffWord = getDifference(wordOfLabel, word);
				// const diffMeaning = getDifference(meaningOfLabel, meaning);
				// new Notice(`diffWord: ${diffWord}`);
				// new Notice(diffMeaning);
			}
		}
	);
};

// 辅助函数：找出两个字符串的不同部分
const getDifference = (str1: string, str2: string) => {
	let diff = '';
	const maxLength = Math.max(str1.length, str2.length);
	for (let i = 0; i < maxLength; i++) {
		if (str1[i] !== str2[i]) {
			diff += str2[i] || str1[i];
		}
	}
	return diff;
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
		className={`flash-card-wrapper${plugin.settings.is_show_word_list ? '' : ' hide'}`}
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
