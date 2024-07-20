import { FieldData } from 'main';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Notice } from 'obsidian';

export function iterateLabelsAndInputs(
	containerEl: HTMLElement,
	callback: (label: HTMLLabelElement, inputs: HTMLInputElement[]) => void
) {
	const labels = containerEl.findAll('label') as HTMLLabelElement[];
	for (const label of labels) {
		const directInputs = Array.from(label.children).filter(
			(child) => child.tagName === 'INPUT'
		) as HTMLInputElement[];
		const grandchildrenInputs = Array.from(
			label.querySelectorAll('label > input')
		) as HTMLInputElement[];
		const inputs = [...directInputs, ...grandchildrenInputs];
		/**
		 * const checkbox = inputs[0]
		 * const textinput = inputs[1]
		 */
		callback(label, inputs);
	}
}

export function parseFieldsFromPreview(
	containerEl: HTMLElement,
	callback: (label: HTMLElement, word: string, meaning: string) => void
) {
	const labels = containerEl.findAll('label') as HTMLLabelElement[];
	for (const label of labels) {
		const directInputs = Array.from(label.children).filter(
			(child) => child.tagName === 'INPUT'
		) as HTMLInputElement[];
		const grandchildrenInputs = Array.from(
			label.querySelectorAll('label > input')
		) as HTMLInputElement[];
		const inputs = [...directInputs, ...grandchildrenInputs];

		let word = label.innerText;
		let meaning = inputs[1].value;

		const del = label.querySelector('del');
		if (del) {
			word = del.getAttribute('data-prototype') || word;
		}

		if (label.classList.contains('sentence')) {
			word = label.innerHTML
				.replace(/<sup[\s\S]*?<\/sup>/g, '') // MD footnote syntax
				.replace(
					`
                    /<code class="code-styler-inline>([\\s\\S]*?)</code>"/g`,
					'$1'
				) // MD inline-code syntax
				.replace(/<[^>]+>/g, '') // HTML tag, must before replace MD footnote syntax
				.replace(/&nbsp;/g, ' '); // &nbsp; -> normal space

			meaning = (label.findAllSelf('input.sentence')[0] as HTMLInputElement).value;
		}

		if (label.classList.contains('nested')) {
			word = label.textContent ?? '';

			meaning = (label.findAllSelf('input.nested')[0] as HTMLInputElement).value;
		}

		callback(label, word, meaning);
	}
}

/**
 *
 * @param text 编辑模式下的笔记文本
 * @param callback 对每一个匹配项()
 */
export async function parseFieldsFromSource(
	text: string,
	callback: (wordDataArray: FieldData[]) => void
) {
	const lines = text.split('\n');
	const wordDataArray: FieldData[] = [];

	// const regExpText = `[\\s\\S]*?`
	const regExpText = `(?:(?!<[^>]+>).)*`;
	const regAnkiId = `(?:\\s+data-anki-id=["'](\\d+)["'])?`;

	const regExpSingleWord = new RegExp(
		`<label${regAnkiId}>(${regExpText})<input value=["']([^"']+)["']><\\/label>`,
		'gm'
	);

	const regExpNestedWord = new RegExp(
		`<label${regAnkiId} class="nested">([\\s\\S]*?)<input value=["']([^"']+)["'] class="nested">\\s*<\\/label>`,
		'gm'
	);

	const regExpNonPrototype = new RegExp(
		`<label${regAnkiId}>${regExpText}<del data-prototype=["']([^"']+)["']>${regExpText}<\\/del>${regExpText}<input\\s+value=["']([^"']+)["']><\\/label>`,
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

	const replaceHtmlEntities = (str: string): string => {
		return str.replace(
			/&(lt|gt);/g,
			(_match, entity) =>
				({
					lt: '<',
					gt: '>',
				}[entity as keyof { lt: string; gt: string }])
		);
	};

	const escapeHtmlTags = (str: string): string => {
		return str.replace(
			/[<>]/g,
			(match) =>
				({
					'<': '&lt;',
					'>': '&gt;',
				}[match as keyof { '<': string; '>': string }])
		);
	};

	lines.forEach(async (lineContent: string, lineNumber: number) => {
		const matches: FieldData[] = [];

		// <label>meaning<input value="word"></label>
		const signleWordMatches = lineContent.matchAll(regExpSingleWord);
		for (const match of signleWordMatches) {
			if (match[2] && match[3]) {
				const isExistAnki = !!match[1];
				const ankiID = Number(match[1]);
				const word = match[2];
				const meaning = replaceHtmlEntities(match[3]);
				matches.push({
					word,
					meaning,
					line: lineNumber,
					isSentence: false,
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
				const word = match[2]
					.replace(/<[^>]+>/g, '') // HTML tag
					.replace(/\[(.*?)\]\(\)/g, '$1') // MD links syntax
					.replace(/\[\^\d+\]/g, '') // MD footnote syntax
					.replace(/\u00A0/g, ' ') // Replace "Non-Breaking Space"
					.replace(/`/g, ''); // Replace inline-code

				const meaning = replaceHtmlEntities(match[3]);
				matches.push({
					word,
					meaning,
					line: lineNumber,
					isSentence: false,
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
				const word = match[2];
				const meaning = replaceHtmlEntities(match[3]);
				matches.push({
					word,
					meaning,
					line: lineNumber,
					isSentence: false,
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
				const word = match[2]
					.replace(/<[^>]+>/g, '') // HTML tag
					.replace(/\[(.*?)\]\(\)/g, '$1') // MD links syntax
					.replace(/\[\^\d+\]/g, '') // MD footnote syntax
					.replace(/\u00A0/g, ' ') // Replace "Non-Breaking Space"
					.replace(/`/g, ''); // Replace inline-code

				const meaning = replaceHtmlEntities(match[3]);
				matches.push({
					word,
					meaning,
					line: lineNumber,
					isSentence: true,
					isExistAnki: isExistAnki,
					ankiID: ankiID,
				});
			}
		}

		// Sort matches based on their appearance in lineContent
		const sortedMatches = matches.sort((a, b) => {
			const indexA = lineContent.indexOf(escapeHtmlTags(a.meaning)); // Sort by a.meaning instead of a.word
			const indexB = lineContent.indexOf(escapeHtmlTags(b.meaning));
			return indexA - indexB;
		});

		// Push sorted matches to wordDataArray
		sortedMatches.forEach(({ word, meaning, line, isSentence, isExistAnki, ankiID }) =>
			wordDataArray.push({ word, meaning, line, isSentence, isExistAnki, ankiID })
		);
	});

	callback(wordDataArray);

	// 使用 Promise 包装回调函数，等待其执行完成
	// await new Promise(resolve => {
	//     callback(wordDataArray)
	//     resolve(null)
	// })
}
