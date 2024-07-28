/* eslint-disable @typescript-eslint/no-unused-vars */
import ReadAssistPlugin from 'main';
import { FieldData } from 'interfaces/field-interface';
import { MarkdownView, Notice } from 'obsidian';
import { ReadAssistPluginSettings } from 'settings/Settings';

import React, { useRef, useEffect, useState } from 'react';
import { parseFieldsFromPreview } from 'func/ParseComment';

import { PopupMenu, SearchableMenuItem } from './menus'; // 替换为实际路径
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
}) => {
	const rowRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleContextMenu = (event: MouseEvent) => {
			event.preventDefault(); // 阻止默认右键菜单

			// 获取 Row 元素
			const rowElement = rowRef.current;
			if (rowElement) {
				rowElement.classList.add('row-active');

				// 创建 PopupMenu 实例
				const menu = new PopupMenu(plugin.app);

				// 添加菜单项
				menu.addItem((item) => {
					item.setTitle('Edit');
					item.handleEvent = (event: Event) => {
						new Notice('Edit clicked');
					};
				});

				menu.addItem((item) => {
					item.setTitle('Delete');
					item.handleEvent = (event: Event) => {
						new Notice('Delete clicked');
					};
				});

				menu.addItem((item) => {
					item.setTitle('More Info');
					item.handleEvent = (event: Event) => {
						new Notice('More Info clicked');
					};
				});

				// 显示菜单
				const rect = rowRef.current?.getBoundingClientRect();
				if (rect) {
					menu.showAtPosition({ x: rect.left, y: rect.bottom });
				}
				// 移除类名以确保菜单隐藏后不会一直存在
				const removeClass = () => {
					rowElement.classList.remove('row-active');
					document.removeEventListener('click', removeClass); // 确保只移除一次
				};
				document.addEventListener('click', removeClass);
			}
		};

		const rowElement = rowRef.current;
		if (rowElement) {
			rowElement.addEventListener('contextmenu', handleContextMenu);
		}

		return () => {
			if (rowElement) {
				rowElement.removeEventListener('contextmenu', handleContextMenu);
			}
		};
	}, [plugin, word, meaning, line, isSentence, isMarked]);

	return (
		<div
			className={`row${isSentence ? ' sentence' : ''}`}
			ref={rowRef}
			onClick={() => {
				onClickHandle(plugin, line, word, meaning);
			}}
		>
			<div className={`word-column${isMarked ? ' ra-star' : ''}`}>{word}</div>
			<div className={`symbol-column`}>-&gt;</div>
			<div className={`meaning-column`}>{meaning}</div>
		</div>
	);
};

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

	parseFieldsFromPreview(
		view.containerEl,
		(previewLabel: HTMLElement, previewWord: string, previewMeaning: string) => {
			if (wordOfLabel === previewWord && meaningOfLabel === previewMeaning) {
				// new Notice(`预览单词：${word}`);
				// new Notice(`预览释义：${meaning}`);
				// new Notice(`源码单词：${wordOfLabel}`);
				// new Notice(`源码释义：${meaningOfLabel}`);

				previewLabel.style.backgroundColor = 'aqua';

				setTimeout(() => {
					previewLabel.style.backgroundColor = '';
				}, 1000);

				return;
			}
		}
	);
};

export function createTopDiv(container: HTMLElement) {
	const flashCardDiv = createEl('div');
	flashCardDiv.addClass('flash-card-div');
	// flashCardDiv.addClass('floating-right');
	flashCardDiv.addClass('floating-left');

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

const ItemCount = ({ count }: { count: number }) => (
	<div className="item-count">Total fields: {count}</div>
);

const Wrapper = ({
	plugin,
	children,
	count,
}: {
	plugin: ReadAssistPlugin;
	children: React.ReactNode;
	count: number;
}) => (
	<div
		className={`flash-card-wrapper${
			plugin.settings.is_show_word_list_settings ||
			plugin.settings.is_show_word_list_command
				? ''
				: ' hide'
		}`}
	>
		<ItemCount count={count} />
		{children}
	</div>
);

export function createWrapper(
	Plugin: ReadAssistPlugin,
	leaf: MarkdownView,
	datasMap: FieldData[]
) {
	const wrapper = leaf.containerEl.find('.flash-card-wrapper');
	if (wrapper == null) return null;

	const listItems: React.ReactNode[] = [];
	for (const data of datasMap) {
		listItems.push(
			<Row
				plugin={Plugin}
				key={data.word + data.meaning}
				word={data.word}
				meaning={data.meaning}
				line={data.line}
				isSentence={data.isSentence}
				isMarked={data.isMarked}
			/>
		);
	}

	return (
		<Wrapper plugin={Plugin} count={listItems.length}>
			{listItems}
		</Wrapper>
	);
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
