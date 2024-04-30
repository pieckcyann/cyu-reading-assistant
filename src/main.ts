// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { App, Editor, MarkdownPostProcessorContext, MarkdownView, Notice, Plugin, debounce } from 'obsidian'
import {
	DEFAULT_SETTINGS,
	ReadAssistPluginSettings,
	ReadAssistSettingTab,
	WordComparedData
} from "settings/Settings"

import ReadAssistance from "./ReadAssist"

import {
	addCommentForSource,
	addCommentForPreview
} from 'func/AddComment'
import { parseActiveViewToComments } from 'func/ParseComment'
import {
	createTopDiv,
	createWrapper,
	removeRow
} from 'components/flashCardUI'

import { createRoot } from 'react-dom/client'
import { extractWordComparedDatas } from 'func/WordMarkCheck'
// import { extractWordComparedDatas } from 'func/WordMarkCheck'

export interface RowData {
	word: string
	meaning: string
	isSentence: boolean
}

export default class ReadAssistPlugin extends Plugin {

	app: App
	settings: ReadAssistPluginSettings
	public data: WordComparedData[]
	public pathToWordSets = this.app.vault.configDir + "/mark-wordsets"

	async onload() {
		await this.loadSettings()

		this.addSettingTab(new ReadAssistSettingTab(this))

		this.settings.data = await extractWordComparedDatas(this.app, this.pathToWordSets)
		this.saveSettings()
		// new Notice(`${this.settings.data[0].fileName}`)

		if (!await this.app.vault.adapter.exists(this.pathToWordSets)) {
			await this.app.vault.createFolder(this.pathToWordSets)
		}

		await this.registerEvents()

		this.registerCommands()
	}

	unload() {
		const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView)
		if (activeLeafView == null) return
		const topDiv = activeLeafView.containerEl.find('.flash-card-div')
		removeRow(topDiv)
	}

	registerEvents = async () => {
		this.app.workspace.onLayoutReady(async () => {
			this.render()
		})

		this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
			this.renderWordList()
		}))

		// this.registerEvent(this.app.workspace.on("file-open", () => {
		// 	this.render()
		// 	new Notice('xxxxxxxxxxxxxxxxx')
		// }))

		this.registerEvent(this.app.metadataCache.on("resolved", () => {
			this.updateWordList()
		}))

	}

	render = async () => {
		this.renderLabelAndInput()
		this.renderWordList()
	}

	renderLabelAndInput = () => {
		this.registerMarkdownPostProcessor(
			async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
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
					}
				}
			})
	}

	renderWordList = async () => {
		const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView)
		if (activeLeafView == null) return
		const existing = activeLeafView.containerEl.querySelector('.flash-card-div')
		if (existing != null) return

		const activeFileText = activeLeafView.currentMode.get()

		createTopDiv(activeLeafView.containerEl)
		const topDiv = activeLeafView.containerEl.find('.flash-card-div')
		const root = createRoot(topDiv)

		let wordDataArray: RowData[] = []
		await parseActiveViewToComments(
			activeFileText,
			(Array) => {
				// console.log(`[cyu]: ${word}`)
				// console.log(`[cyu]: ${meaning}`)
				wordDataArray = Array
			}
		)
		const wrapper = await createWrapper(this, activeLeafView, wordDataArray)
		root.render(wrapper)
	}

	updateWordList = async () => {
		const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView)
		if (activeLeafView == null) return

		const activeFileText = activeLeafView.currentMode.get()

		createTopDiv(activeLeafView.containerEl)
		const topDiv = activeLeafView.containerEl.find('.flash-card-div')
		const root = createRoot(topDiv)

		let wordDataArray: RowData[] = []
		await parseActiveViewToComments(
			activeFileText,
			(Array) => {
				// console.log(`[cyu]: ${word}`)
				// console.log(`[cyu]: ${meaning}`)
				wordDataArray = Array
			}
		)
		const wrapper = await createWrapper(this, activeLeafView, wordDataArray)
		root.render(wrapper)
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await super.loadData())
	}

	async saveSettings() {
		await super.saveData(this.settings)
	}


	// data.json
	// public async loadData(): Promise<void> {
	// 	// const wordComparedDataArray = await extractWordComparedDatas(this.app, this.pathToWordSets)
	// 	// await this.saveData(wordComparedDataArray)

	// 	this.data = Object.assign({}, await super.loadData())
	// 	new Notice(this.data[0].fileName)
	// }

	// public async saveData(comparedDataArray: WordComparedData[]): Promise<void> {
	// 	// const newData: { [key: string]: WordComparedData } = {}

	// 	// comparedDataArray.forEach((data) => {
	// 	// 	newData[data.fileName] = data
	// 	// })

	// 	// await super.saveData(newData)

	// 	const newData = comparedDataArray.map((data) => ({
	// 		fileName: data.fileName,
	// 		fileContent: data.fileContent
	// 	}))

	// 	await super.saveData({ comparedData: newData })
	// }
}