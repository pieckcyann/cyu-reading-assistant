import { FieldData } from 'interfaces/field-interface';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { App, MarkdownView, Notice } from 'obsidian';
import { WordComparator } from './WordMarkCheck';
import { ReadAssistPluginSettings } from 'settings/Settings';
import {
	sourceTextToFieldWord,
	innerHTMLToTextContent,
	entitiesToBrackets,
	bracketsToEntities,
} from 'utils/StringReplace';

export function iterateLabelsAndInputs(
	containerEl: HTMLElement,
	callback: (
		label: HTMLLabelElement,
		textInput: HTMLInputElement,
		allChildElements: HTMLElement[],
		childLabels: HTMLLabelElement[]
	) => void
) {
	const labels = containerEl.findAll('label') as HTMLLabelElement[];
	for (const label of labels) {
		const textInputs = label.findAll('input') as HTMLInputElement[];
		const childLabels = label.findAll('label') as HTMLLabelElement[];
		const allChildElements = Array.from(label.children) as HTMLElement[];
		// console.log(label.textContent + '\n -> \n' + textInputs[textInputs.length - 1].value);
		callback(label, textInputs[textInputs.length - 1], allChildElements, childLabels);
	}
}

export function parseFieldsFromPreview(
	containerEl: HTMLElement,
	callback: (label: HTMLElement, word: string, meaning: string) => void
) {
	const labels = containerEl.findAll('label') as HTMLLabelElement[];
	for (const previewLabel of labels) {
		const directInputs = Array.from(previewLabel.children).filter(
			(child) => child.tagName === 'INPUT'
		) as HTMLInputElement[];
		const grandchildrenInputs = Array.from(
			previewLabel.querySelectorAll('label > input')
		) as HTMLInputElement[];
		const inputs = [...directInputs, ...grandchildrenInputs];

		let previewWord = previewLabel.innerText;
		let previewMeaning = inputs[0].value;

		// 情况一：只选择 previewLabel 的直接子 <del> 元素
		const directDels = Array.from(previewLabel.children).filter(
			(child) => child.tagName === 'DEL'
		) as HTMLElement[];
		const grandchildrenDels = Array.from(
			previewLabel.findAllSelf('label > strong > em > del')
		) as HTMLInputElement[];
		const dels = [...directDels, ...grandchildrenDels];

		if (dels.length > 0) {
			for (const del of dels) {
				previewWord = del.getAttribute('data-prototype') || previewWord;
			}
		} else if (previewLabel.classList.contains('sentence')) {
			// 情况二
			previewWord = innerHTMLToTextContent(previewLabel.innerHTML);
			previewMeaning = (previewLabel.findAllSelf('input.sentence')[0] as HTMLInputElement)
				.value;

			// 如果有多个 input.sentence 元素，使用最后一个值：
			// const inputs = previewLabel.findAllSelf('input.sentence') as HTMLInputElement[];
			// const lastInput = inputs[inputs.length - 1];
			// previewMeaning = lastInput.value;
		} else if (previewLabel.classList.contains('nested')) {
			// 情况三
			previewWord = previewLabel.textContent ?? '';
			previewMeaning = (previewLabel.findAllSelf('input.nested')[0] as HTMLInputElement)
				.value;

			// 如果有多个 input.nested 元素，使用最后一个值：
			// const inputs = previewLabel.findAllSelf('input.nested') as HTMLInputElement[];
			// const lastInput = inputs[inputs.length - 1];
			// previewMeaning = lastInput.value;
		}
		previewWord = previewWord.replace(/(\[\d{1,3}\])/g, '');
		callback(previewLabel, previewWord, previewMeaning);
	}
}

/**
 *
 * @param text 编辑模式下的笔记文本
 * @param callback 对每一个匹配项()
 */
export async function parseFieldsFromSource(
	app: App,
	settings: ReadAssistPluginSettings,
	callback: (wordDataArray: FieldData[]) => void
) {
	const activeLeafView = app.workspace.getActiveViewOfType(MarkdownView);
	if (activeLeafView == null) return;

	const activeFileText = activeLeafView.currentMode.get();

	const lines = activeFileText.split('\n');
	const wordDataArray: FieldData[] = [];

	// const regExpText = `[\\s\\S]*?`
	const regExpText = `(?:(?!<[^>]+>).)*?`;
	const regAnkiId = `(?:\\s+data-anki-id=["'](\\d+)["'])?`;

	const regExpSingleWordDoubleQuoteSentence = new RegExp(
		`<label${regAnkiId}>(${regExpText})<input value=["]([^"]+)["]><\\/label>`,
		'gm'
	);

	const regExpSingleWordSingleQuoteSentence = new RegExp(
		`<label${regAnkiId}>(${regExpText})<input value=[']([^']+)[']><\\/label>`,
		'gm'
	);

	const regExpNestedWord = new RegExp(
		`<label${regAnkiId} class="nested">([\\s\\S]*?)<input value=["']([^"']+)["'] class="nested">\\s*?<\\/label>`,
		// `<label${regAnkiId} class="nested">(${regExpText})<input value=["']([^"']+)["'] class="nested">\\s*<\\/label>`,
		'gm'
	);

	const regExpNonPrototype = new RegExp(
		`<label${regAnkiId}>${regExpText}<del data-prototype=["']([^"']+)["']>.*?<\\/del>${regExpText}<input\\s+value=["']([^"']+)["']><\\/label>`,
		'gm'
	);

	const regExpDoubleQuoteSentence = new RegExp(
		`<label${regAnkiId} class="sentence">([\\s\\S]*?)<input value=["]([^"]+)["] class="sentence">\\s*<\\/label>`,
		'gm'
	);

	const regExpSingleQuoteSentence = new RegExp(
		`<label${regAnkiId} class="sentence">([\\s\\S]*?)<input value=[']([^']+)['] class="sentence">\\s*<\\/label>`,
		'gm'
	);

	lines.forEach(async (lineContent: string, lineNumber: number) => {
		const matches: FieldData[] = [];

		// <label>meaning<input value="word"></label>
		const signleWordMatches = [
			...lineContent.matchAll(regExpSingleWordDoubleQuoteSentence),
			...lineContent.matchAll(regExpSingleWordSingleQuoteSentence),
		];
		for (const match of signleWordMatches) {
			if (match[2] && match[3]) {
				const isExistAnki = !!match[1];
				const ankiID = Number(match[1]);
				const word = sourceTextToFieldWord(match[2]);
				const meaning = entitiesToBrackets(match[3]);
				const isMarked = WordComparator(settings.word_sets_data, word ?? '');

				matches.push({
					word,
					meaning,
					line: lineNumber,
					isSentence: false,
					isMarked: isMarked,
					isExistAnki: isExistAnki,
					ankiID: ankiID,
				});
			}
		}

		// <label class="nested"><label>meaning<input value=""></label><input value="" class="nested"></label>
		const nestedWordMatches = lineContent.matchAll(regExpNestedWord);
		for (const match of nestedWordMatches) {
			if (match[2] && match[3]) {
				const isExistAnki = !!match[1];
				const ankiID = Number(match[1]);
				let word = sourceTextToFieldWord(match[2]);
				if (match[2].includes('</del>')) {
					const regExpDel = new RegExp(`<del data-prototype=["']([^"']+)["']>`, 'gm');
					const delMatch = Array.from(match[2].matchAll(regExpDel));
					const lastMatch = delMatch[delMatch.length - 1];
					word = sourceTextToFieldWord(lastMatch[1]);
				}
				const meaning = entitiesToBrackets(match[3]);
				const isMarked = WordComparator(settings.word_sets_data, word ?? '');

				matches.push({
					word,
					meaning,
					line: lineNumber,
					isSentence: false,
					isMarked: isMarked,
					isExistAnki: isExistAnki,
					ankiID: ankiID,
				});
			}
		}

		// <label>text<del data-prototype="word"></del>text<input value="meaning"></label>
		const nonPrototypeWordMatches = lineContent.matchAll(regExpNonPrototype);
		for (const match of nonPrototypeWordMatches) {
			if (match[2] && match[3]) {
				const isExistAnki = !!match[1];
				const ankiID = Number(match[1]);
				const word = sourceTextToFieldWord(match[2]);
				const meaning = entitiesToBrackets(match[3]);
				const isMarked = WordComparator(settings.word_sets_data, word ?? '');

				matches.push({
					word,
					meaning,
					line: lineNumber,
					isSentence: false,
					isMarked: isMarked,
					isExistAnki: isExistAnki,
					ankiID: ankiID,
				});
			}
		}

		// <label class="sentence">word<input value="meaning" class="sentence"></label>
		// <label class="sentence">word<input value='meaning' class="sentence"></label>
		const sentenceMatches = [
			...lineContent.matchAll(regExpDoubleQuoteSentence),
			...lineContent.matchAll(regExpSingleQuoteSentence),
		];
		for (const match of sentenceMatches) {
			if (match[2] && match[3]) {
				const isExistAnki = !!match[1];
				const ankiID = Number(match[1]);
				const word = sourceTextToFieldWord(match[2]);
				const meaning = entitiesToBrackets(match[3]);
				const isMarked = WordComparator(settings.word_sets_data, word ?? '');

				matches.push({
					word,
					meaning,
					line: lineNumber,
					isSentence: true,
					isMarked: isMarked,
					isExistAnki: isExistAnki,
					ankiID: ankiID,
				});
			}
		}

		// Sort matches based on their appearance in lineContent
		const sortedMatches = matches.sort((a, b) => {
			const indexA = lineContent.indexOf(bracketsToEntities(a.meaning)); // Sort by a.meaning instead of a.word
			const indexB = lineContent.indexOf(bracketsToEntities(b.meaning));
			return indexA - indexB;
		});

		// Push sorted matches to wordDataArray
		sortedMatches.forEach(
			({ word, meaning, line, isSentence, isMarked, isExistAnki, ankiID }) =>
				wordDataArray.push({
					word,
					meaning,
					line,
					isSentence,
					isMarked,
					isExistAnki,
					ankiID,
				})
		);
	});

	callback(wordDataArray);

	// 使用 Promise 包装回调函数，等待其执行完成
	// await new Promise(resolve => {
	//     callback(wordDataArray)
	//     resolve(null)
	// })
}
