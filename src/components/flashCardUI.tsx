import ReadAssistPlugin from 'main'
import { MarkdownView, requireApiVersion } from 'obsidian'
import { ReadAssistPluginSettings } from 'settings/Settings'

import React from 'react'

export function removeRow(wrapper_dom: HTMLElement) {
	// 移除所有子元素
	// while (wrapper_dom.firstChild) {
	//     wrapper_dom.removeChild(wrapper_dom.firstChild)
	// }
	// 移除自身
	// if (wrapper_dom.parentNode) {
	//     wrapper_dom.parentNode.removeChild(wrapper_dom)
	// }

	wrapper_dom.innerHTML = ''
}

// 声明一个 React 组件，用于表示行
const Row = ({ word, meaning }: { word: string; meaning: string }) => (
	<div className="row">
		<div className="word-column">{word}</div>
		<div className="symbol-column">-&gt;</div>
		<div className="meaning-column">{meaning}</div>
	</div>
)

// 返回一个 React 元素，表示创建的行
export function createRow(word: string, meaning: string): React.ReactElement {
	return <Row word={word} meaning={meaning} />
}

// export async function createRow(
// 	word: string,
// 	meaning: string,
// 	wrapper_dom: HTMLElement,
// 	settings: ReadAssistPluginSettings
// ) {
// 	const row_dom = wrapper_dom.createEl('div')
// 	row_dom.addClass('row')

// 	const word_column = row_dom.createEl('div')
// 	word_column.addClass('word-column')
// 	word_column.innerHTML = word

// 	const symbol_column = row_dom.createEl('div')
// 	symbol_column.addClass('symbol-column')
// 	symbol_column.innerHTML = '->'

// 	const meaning_column = row_dom.createEl('div')
// 	meaning_column.addClass('meaning-column')
// 	meaning_column.innerHTML = meaning

// 	row_dom.appendChild(word_column)
// 	row_dom.appendChild(symbol_column)
// 	row_dom.appendChild(meaning_column)

// 	wrapper_dom.appendChild(row_dom)
// }

export function creatWrapper(container: HTMLElement, settings: ReadAssistPluginSettings): void {
	const flash_card_div = container.querySelector('.flash-card-div')
	if (!flash_card_div) {
		const flashCardDiv = createEl('div')
		flashCardDiv.addClass('flash-card-div')
		flashCardDiv.addClass('floating-right')
		container?.querySelector('.markdown-source-view')?.insertAdjacentElement('beforebegin', flashCardDiv)
	} else {
		const flash_card_wrapper = container.querySelector('.flash-card-wrapper')
		if (!flash_card_wrapper) {
			const flashCardWrapper = createEl('div')
			flashCardWrapper.addClass('flash-card-wrapper')
			flashCardWrapper.onmouseenter = function () {
				flashCardWrapper.addClass('hover')
			}
			flashCardWrapper.onmouseleave = function () {
				flashCardWrapper.removeClass('hover')
			}
			flash_card_div.appendChild(flashCardWrapper)
		}
	}
}

export function refresh_node(plugin: ReadAssistPlugin, view: MarkdownView): boolean {
	requireApiVersion('0.15.0') ? (activeDocument = activeWindow.document) : (activeDocument = window.document)

	const flash_card_dom = view.contentEl?.querySelector('.flash-card-div')
	if (flash_card_dom) {
		return true
	} else {
		return false
	}
}
