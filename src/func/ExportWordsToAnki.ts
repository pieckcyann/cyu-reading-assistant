import { App, MarkdownView, Notice } from 'obsidian';
import * as AnkiConnect from 'anki';
import { AnkiConnectNote, AnkiConnectNoteAndID } from 'interfaces/note-interface';
import { parseFieldsFromSource } from './ParseComment';
import { stringify } from 'querystring';
import { addAnkiID } from './UpdateMdFile';
import { FieldData } from 'main';

interface addNoteResponse {
	result: number;
	error: string | null;
}

interface notesInfoResponse {
	result: Array<{
		noteId: number;
		modelName: string;
		tags: string[];
		fields: Record<
			string,
			{
				order: number;
				value: string;
			}
		>;
		cards: number[];
	}>;
	error: string | null;
}

interface Requests1Result {
	0: {
		error: string | null;
		result: Array<{
			result: addNoteResponse[];
			error: string | null;
		}>;
	};
	1: {
		error: string | null;
		result: notesInfoResponse[];
	};
	2: any;
	3: any;
	4: any;
	5: any;
}

type PartOfSpeech = 'Sentence' | 'Word' | 'Phrase';

export class ExportManager {
	app: App;
	activeFileText: string;
	notes_to_new: AnkiConnectNote[];
	notes_to_new_id: Array<number>;
	notes_to_edit: AnkiConnectNoteAndID[];
	requests_1_result: any;
	deckName: string;
	modelName: string;

	constructor(app: App, activeFileText?: string) {
		this.app = app;
		if (activeFileText) this.activeFileText = activeFileText;
		this.notes_to_new = [];
		this.notes_to_new_id = [];
		this.notes_to_edit = [];
		// this.deckName = 'Default';
		this.deckName = 'Periodical';

		// this.modelName = 'Basic';
		this.modelName = 'Periodical';
	}

	Log(message?: any, ...optionalParams: any[]): void {
		new Notice(message);
		console.info(message, ...optionalParams);
	}

	async exportAllWordsToAnki() {
		this.Log('正在检查与 Anki 的连接...');
		try {
			await AnkiConnect.invoke('modelNames');
		} catch (e) {
			this.Log('错误，无法连接到 Anki！请检查控制台以获取错误信息。');
			return;
		}
		this.Log('成功连接到 Anki！这可能需要几分钟，请不要关闭 Anki 直到插件完成。');

		await this.parseAllFields();
		await this.requests_1();

		new Notice('全部完成！现在保存文件哈希值和添加的媒体...');
	}

	async parseAllFields(): Promise<void> {
		const fileName = this.app.workspace.getActiveViewOfType(MarkdownView)?.file?.basename;
		if (!fileName) return;

		await parseFieldsFromSource(this.activeFileText, (array) => {
			for (let arr of array) {
				const wordType = this.judgePartOfWord(arr);

				if (!arr.isExistAnki) {
					// 新增
					this.notes_to_new.push({
						deckName: this.deckName + `::${wordType}`,
						modelName: this.modelName,
						fields: {
							Word: arr.word,
							Meaning: arr.meaning,
							Source: fileName,
						},
						options: {
							allowDuplicate: false,
							duplicateScope: 'deck',
						},
						tags: [wordType],
					});
				} else {
					// 修改
					this.notes_to_edit.push({
						note: {
							deckName: this.deckName + `::${wordType}`,
							modelName: this.modelName,
							fields: {
								Word: arr.word,
								Meaning: arr.meaning,
								Source: fileName,
							},
							options: {
								allowDuplicate: false,
								duplicateScope: 'deck',
							},
							tags: [wordType],
						},
						identifier: arr.ankiID,
					});
				}
			}
		});
	}

	// 在修改一个单词时
	async exportSingleWordsToAnki({
		word,
		meaning,
		isSentence,
		ankiID,
	}: {
		word: string;
		meaning: string;
		isSentence: boolean;
		ankiID: number;
	}) {
		this.Log('正在检查与 Anki 的连接...');
		try {
			await AnkiConnect.invoke('modelNames');
		} catch (e) {
			this.Log('错误，无法连接到 Anki！请检查控制台以获取错误信息。');
			return;
		}
		this.Log('成功连接到 Anki！');

		await this.parseSingleFields({ word, meaning, isSentence, ankiID });
		await this.requests_1();

		new Notice('已修改 anki 中的字段！');
	}

	async parseSingleFields({
		word,
		meaning,
		isSentence,
		ankiID,
	}: {
		word: string;
		meaning: string;
		isSentence: boolean;
		ankiID: number;
	}): Promise<void> {
		const fileName = this.app.workspace.getActiveViewOfType(MarkdownView)?.file?.basename;
		if (!fileName) return;
		const wordType = this.judgePartOfWord({
			word,
			isSentence,
		});

		// 修改
		this.notes_to_edit.push({
			note: {
				deckName: this.deckName + `::${wordType}`,
				modelName: this.modelName,
				fields: {
					Word: word,
					Meaning: meaning,
					Source: fileName,
				},
				options: {
					allowDuplicate: false,
					duplicateScope: 'deck',
				},
				tags: [wordType],
			},
			identifier: ankiID,
		});
	}

	judgePartOfWord({
		word,
		isSentence,
	}: {
		word: string;
		isSentence: boolean;
	}): PartOfSpeech {
		const regex =
			/(n\.|adj\.|v\.|adv\.|pron\.|prep\.|conj\.|int\.|art\.)(\s|[\u4e00-\u9fa5])/;

		if (isSentence) {
			return 'Sentence';
		} else if (regex.test(word)) {
			return 'Word';
		} else {
			return 'Phrase';
		}
	}

	async requests_1() {
		let requests: AnkiConnect.AnkiConnectRequest[] = []; // 用于存储所有请求
		let temp: AnkiConnect.AnkiConnectRequest[] = []; // 临时存储当前批次的请求

		// 请求添加笔记
		console.info('正在向 Anki 发送请求...');
		temp.push(this.getAddNotes()); // 获取添加笔记的请求并添加到临时数组
		requests.push(AnkiConnect.multi(temp)); // 将添加笔记的请求打包成一个批量请求并添加到主请求数组
		temp = []; // 清空临时数组

		// 请求更新现有笔记的字段
		console.info('正在向 Anki 请求更新字段...');
		temp.push(this.getUpdateFields());
		requests.push(AnkiConnect.multi(temp));
		temp = [];

		// 执行所有批量请求
		// this.requests_1_result = (
		// 	(await AnkiConnect.invoke('multi', { actions: requests })) as Array<Object>
		// ).slice(1) as any;

		this.requests_1_result = (await AnkiConnect.invoke('multi', {
			actions: requests,
		})) as Array<Object>;

		await this.parse_requests_1(); // 解析请求结果
	}

	async parse_requests_1() {
		this.Log('正在解析 Anki 返回的请求');
		const response = this.requests_1_result as Requests1Result; // 获取请求结果
		// console.log('Full response:', JSON.stringify(response, null, 3));

		// if (response[5].result.length >= 1 && response[5].result[0].error != null) {
		// 	new Notice('请更新 AnkiConnect！脚本添加媒体文件的方式已更改。');
		// 	console.warn('请更新 AnkiConnect！脚本添加媒体文件的方式已更改。');
		// }

		if (this.notes_to_new != null) {
			const addNoteResponses: addNoteResponse[] = response[0].result[0].result;

			// Extract the `result` property from each `addNoteResponse` object
			this.notes_to_new_id = addNoteResponses.map(
				(addNoteResponse) => addNoteResponse.result
			);

			await addAnkiID({
				notes_to_new: this.notes_to_new,
				notes_to_new_id: this.notes_to_new_id,
			});
		}

		// await this.requests_2();
	}

	async requests_2(): Promise<void> {
		let requests: AnkiConnect.AnkiConnectRequest[] = [];
		let temp: AnkiConnect.AnkiConnectRequest[] = [];
	}

	getAddNotes(): AnkiConnect.AnkiConnectRequest {
		let actions: AnkiConnect.AnkiConnectRequest[] = [];
		for (let note of this.notes_to_new) {
			actions.push(AnkiConnect.addNote(note));
		}
		return AnkiConnect.multi(actions);
	}

	getNoteInfo(): AnkiConnect.AnkiConnectRequest {
		return AnkiConnect.notesInfo(this.notes_to_new_id);
	}

	getUpdateFields(): AnkiConnect.AnkiConnectRequest {
		let actions: AnkiConnect.AnkiConnectRequest[] = [];
		for (let parsed of this.notes_to_edit) {
			actions.push(AnkiConnect.updateNoteFields(parsed.identifier, parsed.note.fields));
		}
		return AnkiConnect.multi(actions);
	}
}
