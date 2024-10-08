import { App, Editor, EditorPosition, Notice } from 'obsidian';
import { PromptModal } from '../components/PromptModal';
import { TemplaterError } from 'utils/Error';
import { AnkiConnectNote } from 'interfaces/note-interface';
import { sourceTextToFieldWord } from 'utils/StringReplace';
import { notice } from 'utils/Notice';
// import escapeHTML from 'escape-html';

export function addCommentForSource({
	containerTag,
	containerTagClass,
	editor,
}: {
	containerTag: string;
	containerTagClass: string;
	editor: Editor;
}) {
	const selection = editor.getSelection();
	if (selection.contains('\n')) return;

	// const escapedSelection = escapeHTML(selection);
	const escapedSelection = selection;
	const replacement = `<${containerTag}${containerTagClass}>${escapedSelection}<input value="comments"${containerTagClass}></${containerTag}>`;

	if (replacement) {
		const currentCursor = editor.getCursor('from');
		const placeholderPositionStartCh =
			currentCursor.ch +
			escapedSelection.length +
			containerTag.length +
			containerTagClass.length +
			16;
		const placeholderPositionEndCh = placeholderPositionStartCh + 8;
		const placeholderPositionStart: EditorPosition = {
			line: currentCursor.line,
			ch: placeholderPositionStartCh,
		};
		const placeholderPositionEnd: EditorPosition = {
			line: currentCursor.line,
			ch: placeholderPositionEndCh,
		};
		editor.replaceSelection(replacement, selection);
		editor.setSelection(placeholderPositionStart, placeholderPositionEnd);
	}
}

export async function addCommentForPreview({
	containerTag,
	containerTagClass,
}: {
	containerTag: string;
	containerTagClass: string;
}) {
	const labelText = document.getSelection()?.toString().trim();
	if (!labelText) return;

	const prompt = new PromptModal('这里输入注释内容：', '', false);

	prompt.openAndGetValue(
		async (value: string) => {
			const commentText = value;
			await addCommentInFile({
				labelText: labelText,
				containerTagClass: containerTagClass,
				commentText: commentText,
				containerTag: containerTag,
			});
		},
		(_?: TemplaterError) => {
			new Notice('未输入注释内容!');
		}
	);
}

async function addCommentInFile({
	labelText,
	containerTagClass,
	commentText,
	containerTag,
}: {
	labelText: string;
	containerTagClass: string;
	commentText: string;
	containerTag: string;
}) {
	if (!labelText.trim() || !commentText.trim()) return;

	const file = this.app.workspace.getActiveFile();
	if (!file) return;

	const fileContent = await this.app.vault.read(file);
	const articleContent = extractArticle(fileContent);
	if (!articleContent) {
		new Notice(`警告：未匹配到规范的文章区域`);
		return;
	}

	const startIndex = fileContent.indexOf(articleContent);
	const endIndex = startIndex + articleContent.length;

	const replaceLabel = (text: string) => {
		return text.replace(
			labelText,
			`<${containerTag}${containerTagClass}>${labelText}<input value="${commentText}"${containerTagClass}></${containerTag}>`
		);
	};

	const newFileContent =
		fileContent.substring(0, startIndex) +
		replaceLabel(fileContent.substring(startIndex, endIndex)) +
		fileContent.substring(endIndex);

	if (newFileContent !== fileContent) {
		await this.app.vault.modify(file, newFileContent);
		new Notice(`已向MD文件中添加标签！`);
	} else {
		new Notice(`警告：未找到文本！`);
		// new Notice(`articleContent is ${articleContent}!`)
		// new Notice(`labelText is ${labelText}!`)
		// new Notice(`commentText is ${commentText}!`)
	}

	function extractArticle(input: string): string | null {
		// const regex = /^#{1,6}\s+(.+?)(?=\n\n(?:^#{1}\s+|$))/ms
		const regex = /^#{1,6}(.*)/ms;
		const match = input.match(regex);
		return match ? match[1] : null;
	}
}

// 替换源码模式下文本
export async function updateInputValueInFile(
	app: App,
	oldValue: string,
	newValue: string
): Promise<void> {
	const file = this.app.workspace.getActiveFile();
	if (!file) return;

	const oldFileContent = await app.vault.read(file);
	const newFileContent = oldFileContent.replace(oldValue, newValue);

	if (oldFileContent == newFileContent) {
		new Notice(`Warning: 尝试修改笔记内容失败...`);
		return;
	}

	await app.vault.modify(file, newFileContent);
	new Notice(`Success: 笔记内容已修改！`);
}

export async function addAnkiID({
	notes_to_new,
	notes_to_new_id,
}: {
	notes_to_new: AnkiConnectNote[];
	notes_to_new_id: Array<number>;
}) {
	const file = this.app.workspace.getActiveFile();
	if (!file) return;

	const oldfileContent = await this.app.vault.read(file);
	let newFileContent = oldfileContent;

	// for (let i = 0; i < notes_to_new.length; i++) {
	// 	console.log('word: ' + notes_to_new[i].fields.Front);
	// 	console.log('id: ' + notes_to_new_id[i]);
	// }

	const regExpText = `(?:(?!<[^>]+>).)*`;

	const regExpSingleWord = new RegExp(
		`(<label)(>${regExpText}<input value=["'][^"']+["']><\\/label>)`,
		'gm'
	);
	const regExpNestedWord = new RegExp(
		`(<label)( class="nested">[\\s\\S]*?<input value=["'][^"']+["'] class="nested">\\s*<\\/label>)`,
		'gm'
	);
	const regExpDoubleQuoteSentence = new RegExp(
		`(<label)( class="sentence">[\\s\\S]*?<input value=["][^"]+["] class="sentence">\\s*<\\/label>)`,
		'gm'
	);
	const regExpSingleQuoteSentence = new RegExp(
		`(<label)( class="sentence">[\\s\\S]*?<input value=['][^']+['] class="sentence">\\s*<\\/label>)`,
		'gm'
	);

	const regExpNonPrototype = new RegExp(
		`(<label)(>${regExpText}<del data-prototype=["'])([^"']+)(["']>${regExpText}<\\/del>${regExpText}<input\\s+value=["'][^"']+["']><\\/label>)`,
		'gm'
	);

	let n = 0;

	function matchAndReplace(regex: RegExp, index: number): boolean {
		const matches: Array<RegExpMatchArray> = Array.from(newFileContent.matchAll(regex));
		let finished = false;

		if (!regex.toString().includes('<del')) {
			for (const match of matches) {
				let matchWord = sourceTextToFieldWord(match[0]);

				const word = notes_to_new[index].fields.Word;

				if (matchWord === word) {
					newFileContent = newFileContent.replace(
						match[0],
						match[0].replace(regex, `$1 data-anki-id="${notes_to_new_id[index]}"$2`)
					);
					finished = true;
					break; // quit after finded
				}
			}
		} else {
			for (const match of matches) {
				let matchWord = match[3];
				const word = notes_to_new[index].fields.Word;
				if (matchWord === word) {
					newFileContent = newFileContent.replace(
						match[0],
						match[0].replace(regex, `$1 data-anki-id="${notes_to_new_id[index]}"$2$3$4`)
					);
					finished = true;
					break;
				}
			}
		}

		return finished;
	}

	for (let i = 0; i < notes_to_new.length; i++) {
		// const labelWithDelRegex = new RegExp(`(<label)(<del data-prototype="`, 'gm');
		if (matchAndReplace(regExpSingleWord, i)) continue;
		if (matchAndReplace(regExpNestedWord, i)) continue;
		if (matchAndReplace(regExpDoubleQuoteSentence, i)) continue;
		if (matchAndReplace(regExpSingleQuoteSentence, i)) continue;
		if (matchAndReplace(regExpNonPrototype, i)) continue;
	}

	if (newFileContent != oldfileContent) {
		await this.app.vault.modify(file, newFileContent);
		new Notice('已向笔记中添加了 Anki ID');
	}
}
