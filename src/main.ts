import { MarkdownPostProcessorContext, Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	ReadAssistPluginSettings,
	ReadAssistSettingTab
} from "settings/Settings"
import ReadAssistance from "./core/ReadAssist"
import { addComment } from 'AddComment'

export default class ReadAssistPlugin extends Plugin {
	public settings: ReadAssistPluginSettings
	public pathToWordSets = this.app.vault.configDir + "/mark-wordsets";

	onload = async (): Promise<void> => {
		await this.loadSettings();
		this.addSettingTab(new ReadAssistSettingTab(this));

		if (!await this.app.vault.adapter.exists(this.pathToWordSets))
			await this.app.vault.createFolder(this.pathToWordSets)

		this.registerMarkdownPostProcessor(
			(el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					ctx.addChild(
						new ReadAssistance(
							this.app,
							el,
							activeFile,
							ctx.sourcePath,
							this.pathToWordSets,
							this.settings
						)
					);
				}
			}
		);

		this.addCommand({
			id: "add-word-comment",
			name: "为单词添加注释块",
			callback: () => { addComment(false) },
			hotkeys: [
				{
					modifiers: ['Ctrl', 'Shift'],
					key: 'C'
				}
			]
		});

		this.addCommand({
			id: "add-sentence-comment",
			name: "为句子添加注释块",
			callback: () => { addComment(true) },
			hotkeys: [
				{
					modifiers: ['Ctrl', 'Alt'],
					key: 'C'
				}
			]
		});
	}

	word_count_display() {
		// 获取第一个 h1 标题元素
		const firstH1 = document.querySelector('.reading.markdown-rendered h1');

		// 如果存在第一个 h1 标题元素，则创建一个 span 元素并添加到其后面
		if (firstH1) {
			const span = document.createElement('span');
			span.textContent = 'Hello, World!'; // 设置 span 元素的文本内容
			firstH1.insertAdjacentElement('afterend', span); // 将 span 元素添加到第一个 h1 标题元素之后
		} else {
			console.error('No h1 element found.'); // 如果不存在第一个 h1 标题元素，则输出错误信息
		}
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}