import { App, MarkdownRenderChild, MarkdownView, Notice, TFile } from 'obsidian'
import { ReadAssistPluginSettings } from 'settings/Settings'
import { WordComparator } from 'func/WordMarkCheck'
import { iterateLabels } from './func/ParseComment'
import {
	mountWordCounter,
	unmountWordCounter
} from './components/WordCounter'

import {
	adjustInputWidth,
	getInputTextWidth
} from './func/InputAdjuest'


export default class ReadAssistance extends MarkdownRenderChild {

	constructor(
		private app: App,
		public activeFile: TFile,
		public activeLeafView: MarkdownView,
		public renderedDiv: HTMLElement,
		public pathToWordSets: string,
		public settings: ReadAssistPluginSettings
	) {
		super(renderedDiv)
	}

	async onload() {
		this.setForLabels()
		this.setForInputs()
		this.registerEvents()

		this.checkCounter()
	}

	unload() {
		this.removeInputListeners()
		unmountWordCounter(this.containerEl)
	}

	checkCounter = () => {
		const wordCounter = this.containerEl.querySelector(".ra-count-display") as HTMLElement
		if (!wordCounter) mountWordCounter(this.containerEl)
	}

	registerEvents() {
		// this.registerEvent(this.app.workspace.on("file-open", this.onFileChangeHandler))
		// this.registerEvent(this.app.metadataCache.on("changed", this.onFileChangeHandler))
		// this.registerEvent(this.app.workspace.on("active-leaf-change", this.onActiveLeafChangeHandler))
		// this.registerEvent(this.app.metadataCache.on("resolved", this.onFileChangeHandler))
	}

	onEditorChangeHandler = () => {
		/**
		creatWrapper(this.activeLeaf.containerEl, this.settings)
		this.checkWrapNode()
		this.checkRowNode()
		*/
	}

	onFileChangeHandler = () => {
		this.onEditorChangeHandler()
	}

	onActiveLeafChangeHandler = () => {
		this.onEditorChangeHandler()
	}

	setForLabels() {
		iterateLabels(
			this.containerEl,
			async (label: HTMLLabelElement, inputs: HTMLInputElement[]) => {
				if (inputs.length > 0) {
					const checkboxInput = document.createElement('input')
					checkboxInput.type = 'checkbox'
					label.insertBefore(checkboxInput, inputs[0])
					inputs[0].type = 'text'

					let textInput
					if (label.classList.contains('sentence') || label.classList.contains('nested')) {
						textInput = inputs[inputs.length - 1]
					} else {
						textInput = inputs[1]
					}

					// 修复嵌套label的点击事件混乱
					label.addEventListener('click', (event) => {
						event.preventDefault()
						event.stopPropagation()
						if (checkboxInput) {
							checkboxInput.checked = !checkboxInput.checked
						}
						adjustInputWidth(textInput)
					})

					// 右键点击复制
					label.addEventListener('contextmenu', (event) => {
						event.preventDefault()
						event.stopPropagation()
						const copyText = label.textContent ?? ''
						navigator.clipboard.writeText(copyText)
					})

					// 添加星标span
					if (this.settings.is_mark_star == true) {
						const isMarked = WordComparator(this.settings.word_sets_data, label.textContent ?? '')
						if (isMarked) {
							const starSpan = document.createElement('span')
							starSpan.addClass('ra-star')
							label.appendChild(starSpan)
						}
					}
				}
			})
	}

	async setForInputs(): Promise<void> {
		iterateLabels(
			this.containerEl,
			async (label: HTMLLabelElement, inputs: HTMLInputElement[]) => {
				const textInput = inputs[1]

				textInput.addEventListener('input', () => {
					adjustInputWidth(textInput)
				})
				textInput.removeEventListener('keyup', this.onInputKeyUp)
				textInput.addEventListener('keyup', this.onInputKeyUp)
				textInput.addEventListener('click', this.onInputClick)
				// 防止点击input触发label的active伪类
				textInput.addEventListener('mousedown', () => {
					label.classList.contains('sentence')
						? (label.style.backgroundColor = 'rgba(1199, 43, 108, 0.06)')
						: (label.style.backgroundColor = '#ecefe8')
				})
				textInput.addEventListener('mouseup', () => {
					label.removeAttribute('style')
				})
				textInput.addEventListener('focus', () => {
					textInput.style.width = getInputTextWidth(textInput) + 16 * 1.5 + 'px'
				})
				textInput.addEventListener('blur', () => {
					adjustInputWidth(textInput)
				})
			})
	}

	private onInputClick = async (event: MouseEvent) => {
		event.preventDefault()
		event.stopPropagation()
	}

	private onInputKeyUp = async (event: KeyboardEvent) => {
		const textInput = event.target as HTMLInputElement
		const label = textInput.parentElement ?? null
		/* eslint-disable prefer-const */
		let labelText = { value: (label?.textContent ?? '').trim() }
		const oldValue = textInput.defaultValue
		const newValue = textInput.value

		if (label && event.key === 'Enter' && newValue.trim() !== oldValue.trim()) {
			event.preventDefault()
			event.stopPropagation()

			checkChildrenLabelTag(label, labelText)
			checkChildrenDelTag(label, labelText)

			await this.updateInputValueInFile(
				labelText.value,
				oldValue, newValue,
				label.classList.contains('sentence'),
				label.classList.contains('nested'),
			)
		}

		function checkChildrenDelTag(label: HTMLElement, labelTextObj: { value: string }) {
			const del = label.querySelector('del')
			if (del) {
				const delText = del.innerText
				const delAttr = del.getAttribute('data-prototype')
				labelTextObj.value = labelTextObj.value.replace(
					delText,
					`<del data-prototype="${delAttr}">${delText}</del>`
				)
			}
		}

		function checkChildrenLabelTag(label: HTMLElement, labelTextObj: { value: string }) {
			const childrenLabels = label.querySelectorAll('label')
			if (childrenLabels.length > 0) {
				childrenLabels.forEach((childrenLabel) => {
					let childrenLabelText = {
						value: (childrenLabel?.textContent ?? '').trim(),
					}
					const childrenInputText = (childrenLabel.querySelector('input[type="text"]') as HTMLInputElement)?.value || ''
					let quoteType
					newValue.includes('"') ? (quoteType = `'`) : (quoteType = `"`)
					labelTextObj.value = labelTextObj.value.replace(
						childrenLabelText.value,
						`<label>${childrenLabelText.value}<input value=${quoteType}${childrenInputText}${quoteType}></label>`
					)
					checkChildrenDelTag(childrenLabel, childrenLabelText)
				})
			}
		}
	}

	async removeInputListeners(): Promise<void> {
		iterateLabels(
			this.containerEl,
			async (label: HTMLLabelElement, inputs: HTMLInputElement[]) => {
				const textInput = inputs[1]

				textInput.removeEventListener('input', () => adjustInputWidth(textInput))
				textInput.removeEventListener('keyup', this.onInputKeyUp)
				textInput.removeEventListener('click', this.onInputClick)
				textInput.removeEventListener('mousedown', () => {
					label.classList.contains('sentence')
						? (label.style.backgroundColor = 'rgba(199, 43, 108, 0.08)')
						: (label.style.backgroundColor = '#ecefe8')
				})
				textInput.removeEventListener('mouseup', () => {
					label.removeAttribute('style')
				})
				textInput.removeEventListener('focus', () => {
					textInput.style.width = getInputTextWidth(textInput) + 16 * 1.5 + 'px'
				})
				textInput.removeEventListener('blur', () => {
					adjustInputWidth(textInput)
				})
			})
	}

	// 替换源码模式下文本
	async updateInputValueInFile(
		labelText: string,
		oldValue: string,
		newValue: string,
		isSentence: boolean,
		isNested: boolean
	): Promise<void> {
		const file = this.activeFile
		if (!file) return
		const fileContent = await this.app.vault.read(file)

		let labelClass
		if (isSentence) {
			labelClass = ' class="sentence"'
		} else if (isNested) {
			labelClass = ' class="nested"'
		} else {
			labelClass = ''
		}

		let regex = getRegexForLabel(labelText, oldValue, labelClass)
		const linkRegex = /\[([^\]]+)\]\(\)/g
		// const footnoteRegex = /\[\^(\d+)\]/g

		if ((fileContent.match(regex) || []).length < 1) {
			let linkMatch
			while ((linkMatch = linkRegex.exec(fileContent)) !== null) {
				const linkText = linkMatch[1]
				if (labelText.includes(linkText)) {
					labelText = labelText.replace(linkText, `[${linkText}]()`)
				}
			}

			// 检测 footnote 格式并替换
			// let footnoteMatch;
			// while ((footnoteMatch = footnoteRegex.exec(fileContent)) !== null) {
			//     const footnoteText = footnoteMatch[1];
			//     if (labelText.includes(footnoteText)) {
			//         labelText = labelText.replace(footnoteText, `[^${footnoteText}]`);
			//         new Notice(footnoteText);
			//     }
			// }

			regex = getRegexForLabel(labelText, oldValue, labelClass)
		}

		let quoteType
		newValue.includes('"') ? (quoteType = `'`) : (quoteType = `"`)

		const newFileContent = fileContent.replace(
			regex,
			`<label${labelClass}>${labelText}<input value=${quoteType}${newValue}${quoteType}${labelClass}></label>`
		)
		await this.app.vault.modify(file, newFileContent)
		showNoticeForMatchCount(fileContent, regex)

		function getRegexForLabel(labelText: string, oldValue: string, labelClass: string): RegExp {
			const escapedLabelText = escapeRegExp(labelText)
			const escapedOldValue = escapeRegExp(oldValue)
			const escapedlabelClass = escapeRegExp(labelClass)

			let quoteType
			oldValue.includes('"') ? (quoteType = `'`) : (quoteType = `"`)
			const regexPattern = `<label${escapedlabelClass}>${escapedLabelText}<input value=${quoteType}${escapedOldValue}${quoteType}${labelClass}></label>`

			return new RegExp(regexPattern, 'g')
		}

		function showNoticeForMatchCount(fileContent: string, regex: RegExp): void {
			const matchCount = (fileContent.match(regex) || []).length
			if (matchCount === 1) {
				new Notice(`提示：笔记内容已修改`)
			} else if (matchCount > 1) {
				new Notice(`提示：重复了 ${matchCount} 处`)
			} else if (matchCount < 1) {
				new Notice(`警告：未找到对应的label标签文本`)
			}
		}

		// 替换：加反斜杠变为特殊字符
		function escapeRegExp(str: string): string {
			return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		}
	}

	clearEffectsOnEditorChange() {
		// TODO: 解决 “编辑源码后会强制改变checkboxinput状态” 问题
	}

	positionComment = () => {
		// TODO: 优化提示框textinput位置
	}
}
