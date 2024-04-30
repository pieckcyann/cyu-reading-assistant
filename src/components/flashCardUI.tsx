import { WordData } from 'main';
import { MarkdownView } from 'obsidian';
import { ReadAssistPluginSettings } from 'settings/Settings';

import React from 'react';

const Row = ({ word, meaning }: { word: string; meaning: string }) => (
	<div className="row">
		<div className="word-column">{word}</div>
		<div className="symbol-column">-&gt;</div>
		<div className="meaning-column">{meaning}</div>
	</div>
);

export function createRow(word: string, meaning: string): React.ReactElement {
	return <Row word={word} meaning={meaning} />;
}

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

export function createWrapper(leaf: MarkdownView, datasMap: WordData[]) {
	const wrapper = leaf.containerEl.find('.flash-card-wrapper');
	if (wrapper == null) return;

	const listItems = datasMap.map((data) => (
		<Row key={data.word} word={data.word} meaning={data.meaning}></Row>
	));

	return <Wrapper>{listItems}</Wrapper>;
}

export function removeRow(wrapper_dom: HTMLElement) {
	// 移除所有子元素
	// while (wrapper_dom.firstChild) {
	//     wrapper_dom.removeChild(wrapper_dom.firstChild)
	// }
	// 移除自身
	// if (wrapper_dom.parentNode) {
	//     wrapper_dom.parentNode.removeChild(wrapper_dom)
	// }

	wrapper_dom.innerHTML = '';
}
