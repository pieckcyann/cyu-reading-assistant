import { Editor, MarkdownPostProcessorContext, MarkdownView, Plugin } from 'obsidian'
import {
	DEFAULT_SETTINGS,
	ReadAssistPluginSettings,
	ReadAssistSettingTab
} from "settings/Settings"
import ReadAssistance from "./core/ReadAssist"
import {
	addCommentForSource,
	addCommentForPreview
} from 'AddComment'

export default class ReadAssistPlugin extends Plugin {
	public settings: ReadAssistPluginSettings
	public pathToWordSets = this.app.vault.configDir + "/mark-wordsets";

	onload = async (): Promise<void> => {
		await this.loadSettings()
		this.addSettingTab(new ReadAssistSettingTab(this))

		if (!await this.app.vault.adapter.exists(this.pathToWordSets))
			await this.app.vault.createFolder(this.pathToWordSets)

		this.registerMarkdownPostProcessor(
			(el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				const activeFile = this.app.workspace.getActiveFile()
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
					)
				}
			}
		)
		this.registerCommands()

	}

	registerCommands() {
		this.addCommand({
			id: "add-word-comment-in-source",
			name: "在源码模式下：为单词添加注释块",
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'X' }],
			editorCallback: (editor: Editor, _: MarkdownView) => {
				addCommentForSource({
					containerTag: 'label',
					containerTagClass: '',
					editor: editor
				})
			}
		})

		this.addCommand({
			id: "add-sentence-comment-in-source",
			name: "在源码模式下：为句子添加注释块",
			hotkeys: [{ modifiers: ['Ctrl', 'Alt'], key: 'X' }],
			editorCallback: (editor: Editor, _: MarkdownView) => {
				addCommentForSource({
					containerTag: 'label',
					containerTagClass: ' class="sentence"',
					editor: editor
				})
			}
		})

		this.addCommand({
			id: "add-word-comment-in-preview",
			name: "在预览模式下：为单词添加注释块",
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'C' }],
			callback: () => {
				addCommentForPreview({
					containerTag: 'label',
					containerTagClass: ''
				})
			}
		})

		this.addCommand({
			id: "add-sentence-comment-in-preview",
			name: "在预览模式下：为句子添加注释块",
			hotkeys: [{ modifiers: ['Ctrl', 'Alt'], key: 'C' }],
			callback: () => {
				addCommentForPreview({
					containerTag: 'label',
					containerTagClass: ' class="sentence"'
				})
			}
		})
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}