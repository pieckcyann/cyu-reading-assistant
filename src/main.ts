import { App, Editor, MarkdownPostProcessorContext, MarkdownView, Plugin } from 'obsidian'
import {
	DEFAULT_SETTINGS,
	ReadAssistPluginSettings,
	ReadAssistSettingTab
} from "settings/Settings"
import ReadAssistance from "./core/ReadAssist"

import {
	addCommentForSource,
	addCommentForPreview
} from 'function/AddComment'

export default class ReadAssistPlugin extends Plugin {

	app: App
	settings: ReadAssistPluginSettings
	pathToWordSets = this.app.vault.configDir + "/mark-wordsets"

	async onload() {
		await this.loadSettings()
		this.addSettingTab(new ReadAssistSettingTab(this))

		if (!await this.app.vault.adapter.exists(this.pathToWordSets)) {
			await this.app.vault.createFolder(this.pathToWordSets)
		}

		this.render()

		this.registerCommands()
	}

	render = () => {
		this.app.workspace.onLayoutReady(() => {

			this.registerMarkdownPostProcessor(
				(el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
					const isSetDirectory = ctx.sourcePath.startsWith(this.settings.articles_folder)
					if (isSetDirectory) {
						const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView)
						const activeFile = this.app.workspace.getActiveFile()
						if (activeLeafView && activeFile) {
							ctx.addChild(
								new ReadAssistance(
									this.app,
									activeFile,
									activeLeafView,
									el,
									this.pathToWordSets,
									this.settings)
							)
							console.log(el)
						}
					}
				})
		})

	}

	registerCommands() {
		this.addCommand({
			id: "hide-word-list",
			name: "隐藏/显示单词总览面板",
			icon: "list",
			callback: async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				if (view) {
					const flashCardWrapper =
						view.contentEl.querySelector(".flash-card-div")
					if (flashCardWrapper) {
						if (flashCardWrapper.classList.contains("hide"))
							flashCardWrapper.removeClass("hide")
						else flashCardWrapper.addClass("hide")
					}
				}
			},
		})

		// 

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

	// data.json
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}