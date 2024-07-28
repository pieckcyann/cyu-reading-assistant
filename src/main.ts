/* eslint-disable @typescript-eslint/no-unused-vars */
import {
	App,
	Editor,
	MarkdownPostProcessorContext,
	MarkdownView,
	Notice,
	Plugin,
	WorkspaceLeaf,
	debounce,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	ReadAssistPluginSettings,
	ReadAssistSettingTab,
	WordComparedData,
} from 'settings/Settings';

import ReadAssistance from './ReadAssist';

import { addCommentForSource, addCommentForPreview } from 'func/UpdateMdFile';
import { parseFieldsFromSource } from 'func/ParseComment';
import {
	createTopDiv,
	createWrapper,
	getScrollTopWrapper,
	removeRow,
	setScrollTopWrapper,
} from 'components/WordListUI';

import { createRoot } from 'react-dom/client';
import { extractWordComparedDatas } from 'func/WordMarkCheck';
import { ExportManager } from 'func/ExportWordsToAnki';

import { FieldData } from 'interfaces/field-interface';
import { mountWordCounter, unmountWordCounter } from 'components/WordCounter';

export default class ReadAssistPlugin extends Plugin {
	app: App;
	settings: ReadAssistPluginSettings;
	public data: WordComparedData[];
	public pathToWordSets = this.app.vault.configDir + '/mark-wordsets';

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new ReadAssistSettingTab(this));

		await this.registerEvents();

		if (!(await this.app.vault.adapter.exists(this.pathToWordSets)))
			await this.app.vault.createFolder(this.pathToWordSets);

		// Reads all wordsets in the'mark-wordsets' directory
		this.settings.word_sets_data = await extractWordComparedDatas(
			this.app,
			this.pathToWordSets
		);
		this.saveSettings();

		this.registerCommands();
	}

	onunload() {
		const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeLeafView == null) return;
		const topDiv = activeLeafView.containerEl.find('.flash-card-div');
		removeRow(topDiv);
		unmountWordCounter(activeLeafView.containerEl);
	}

	checkIsSetDir = (): boolean => {
		const activeFilePath =
			this.app.workspace.getActiveViewOfType(MarkdownView)?.file?.path ?? '';
		return activeFilePath.startsWith(this.settings.articles_folder);
	};

	registerEvents = async () => {
		this.app.workspace.onLayoutReady(async () => {
			this.render();
		});

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
				this.renderWordList();
				// new Notice('活动页改变了！');
			})
		);

		// this.app.vault.on("modify", () => { })
		// this.registerEvent(this.app.metadataCache.on("changed", () => { }))
		// this.registerEvent(this.app.metadataCache.on("resolved", () => { }))
		this.registerEvent(
			this.app.metadataCache.on('changed', () => {
				this.updateWordList();
				// debounce(() => { new Notice('xxxxxxxxxxxxxxx') }, 1000)
			})
		);

		// this.registerEvent(this.app.workspace.on("file-open", () => { }))
	};

	render = async () => {
		this.renderLabelAndInput();
		this.renderWordList();
	};

	renderLabelAndInput = () => {
		this.registerMarkdownPostProcessor(
			async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				const isSetDirectory = ctx.sourcePath.startsWith(this.settings.articles_folder);
				if (isSetDirectory) {
					const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView);
					const activeFile = this.app.workspace.getActiveFile();
					if (activeLeafView && activeFile) {
						ctx.addChild(
							new ReadAssistance(
								this.app,
								activeFile,
								activeLeafView,
								el,
								this.pathToWordSets,
								this.settings
							)
						);
					}
				}
			}
		);
	};

	renderWordList = async () => {
		const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeLeafView == null) return;
		if (!this.checkIsSetDir()) return;
		const existing = activeLeafView.containerEl.querySelector('.flash-card-div');
		if (existing != null) {
			this.updateWordList();
			return;
		}

		const floatingTOC = activeLeafView.containerEl.find('.floating-toc-div');
		if (floatingTOC) {
			floatingTOC.style.display = 'none';
		}

		// 创建单词含义对照表
		createTopDiv(activeLeafView.containerEl);
		const topDiv = activeLeafView.containerEl.find('.flash-card-div');
		const root = createRoot(topDiv);

		let wordDataArray: FieldData[] = [];
		await parseFieldsFromSource(this.app, this.settings, (array) => {
			wordDataArray = array;
		});
		const wrapper = createWrapper(this, activeLeafView, wordDataArray);
		root.render(wrapper);
	};

	updateWordList = async () => {
		const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeLeafView == null) return;
		if (!this.checkIsSetDir()) return;

		// const scrollPosition = await getScrollTopWrapper(this)
		const scrollPosition = 482;

		const activeFileText = activeLeafView.currentMode.get();

		createTopDiv(activeLeafView.containerEl);
		const topDiv = activeLeafView.containerEl.find('.flash-card-div');
		const root = createRoot(topDiv);

		let wordDataArray: FieldData[] = [];
		await parseFieldsFromSource(this.app, this.settings, (array) => {
			wordDataArray = array;
		});
		const wrapper = createWrapper(this, activeLeafView, wordDataArray);
		root.render(wrapper);

		const wrapper1 = activeLeafView.containerEl.find('.flash-card-wrapper');
		wrapper1.scroll(0, scrollPosition);

		// setTimeout(() => {
		// setScrollTopWrapper(this, scrollPosition)
		// }, 0)
	};

	registerCommands() {
		this.addCommand({
			id: 'hide-word-list',
			name: '隐藏/显示单词总览列表面板',
			icon: 'list',
			callback: async () => {
				this.settings.is_show_word_list_command =
					!this.settings.is_show_word_list_command;

				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					const flashCardWrapper = view.contentEl.querySelector('.flash-card-wrapper');
					if (flashCardWrapper) {
						if (flashCardWrapper.classList.contains('hide'))
							flashCardWrapper.removeClass('hide');
						else flashCardWrapper.addClass('hide');
					}
				}
			},
		});

		//

		this.addCommand({
			id: 'add-word-comment-in-source',
			name: '在源码模式下：为单词添加注释块',
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'X' }],
			editorCallback: (editor: Editor, _: MarkdownView) => {
				addCommentForSource({
					containerTag: 'label',
					containerTagClass: '',
					editor: editor,
				});
			},
		});

		this.addCommand({
			id: 'add-sentence-comment-in-source',
			name: '在源码模式下：为句子添加注释块',
			hotkeys: [{ modifiers: ['Ctrl', 'Alt'], key: 'X' }],
			editorCallback: (editor: Editor, _: MarkdownView) => {
				addCommentForSource({
					containerTag: 'label',
					containerTagClass: ' class="sentence"',
					editor: editor,
				});
			},
		});

		this.addCommand({
			id: 'add-word-comment-in-preview',
			name: '在预览模式下：为单词添加注释块',
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'C' }],
			callback: () => {
				addCommentForPreview({
					containerTag: 'label',
					containerTagClass: '',
				});
			},
		});

		this.addCommand({
			id: 'add-sentence-comment-in-preview',
			name: '在预览模式下：为句子添加注释块',
			hotkeys: [{ modifiers: ['Ctrl', 'Alt'], key: 'C' }],
			callback: () => {
				addCommentForPreview({
					containerTag: 'label',
					containerTagClass: ' class="sentence"',
				});
			},
		});

		this.addCommand({
			id: 'export-all-words-from-notes-to-anki',
			name: '导出当前笔记中的所有单词到Anki中',
			// editorCallback: async (editor: Editor, ctx: MarkdownView) => {
			callback: () => {
				const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeLeafView == null) return;
				const activeFileText = activeLeafView.currentMode.get();

				const em = new ExportManager(this.app, this.settings, activeFileText);
				em.exportAllWordsToAnki();
			},
		});
	}

	// data.json
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await super.loadData());
	}

	async saveSettings() {
		await super.saveData(this.settings);
	}
}
