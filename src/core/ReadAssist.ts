import { App, MarkdownRenderChild, MarkdownView, Notice, TFile } from 'obsidian'
import { ReadAssistPluginSettings } from 'settings/Settings'
import { WordChecker } from 'core/WordChecker'
import { iterateLabels } from './WordCache'
import {
	mountWordCounter,
	unmountWordCounter
} from './WordCount'

import {
	createRow,
	creatWrapper
} from "components/flashCardUI"

import { getComments } from "core/WordCache"


export default class ReadAssistance extends MarkdownRenderChild {
	private leafContainerEl = this.activeLeaf.containerEl

	constructor(
		private app: App,
		public container: HTMLElement,
		public activeFile: TFile,
		public activeLeaf: MarkdownView,
		public pathToWordSets: string,
		public settings: ReadAssistPluginSettings
	) {
		super(container)
		this.setForLabels()
		// console.log(`${container.innerHTML}`)
		// console.log(`${activeLeaf.containerEl.querySelector('label')?.textContent}`)
	}

	async onload() {
		await this.setForInputs()
		this.registerEvents()

		mountWordCounter(this.containerEl)

		creatWrapper(this.leafContainerEl, this.settings)
		this.genRow()
	}

	genRow() {
		const wrapper_dom = this.activeLeaf.containerEl.querySelector(".flash-card-wrapper") as HTMLElement

		getComments(
			this.container,
			async (word: string, comment: string) => {
				createRow(word, comment, wrapper_dom, this.settings)
			})
	}

	unload() {
		this.removeInputListeners()
		unmountWordCounter(this.containerEl)
	}

	registerEvents() {
		iterateLabels(
			this.container,
			async (label: HTMLLabelElement, inputs: HTMLInputElement[]) => {
				const textInput = inputs[1]
				this.registerDomEvent(label, 'click', async () => {
					this.adjustInputWidth(textInput)

				})
			})
	}

	setForLabels() {
		iterateLabels(
			this.container,
			async (label: HTMLLabelElement, inputs: HTMLInputElement[]) => {
				if (inputs.length > 0) {
					const checkboxInput = document.createElement('input')
					checkboxInput.type = 'checkbox'
					label.insertBefore(checkboxInput, inputs[0])
					inputs[0].type = 'text'
					const textInput = inputs[1]

					// 修复嵌套label的点击事件混乱
					label.addEventListener('click', (event) => {
						event.preventDefault()
						event.stopPropagation()
						if (checkboxInput) {
							checkboxInput.checked = !checkboxInput.checked
						}
						const del = label.querySelector('del')
						if (del) {
							// new Notice(`原型：${del.getAttribute('data-prototype')}`)
							// const labelText = label.innerText.replace(
							//     del?.innerText,
							//     del.getAttribute('data-prototype') ?? ''
							// )
							// new Notice(`单词原型：${labelText}`)
						}
					})
					// 右键点击复制
					label.addEventListener('contextmenu', (event) => {
						event.preventDefault()
						event.stopPropagation()
						const copyText = label.textContent ?? ''
						navigator.clipboard.writeText(copyText)
					})

					// 添加星标span
					await this.checkWordMarked(label, textInput)
				}
			})
	}

	async checkWordMarked(label: HTMLLabelElement, textInput: HTMLInputElement) {
		if (label.classList.contains('sentence')) return

		const textContent = (label.textContent ?? '').toLowerCase()
		const inputValue = textInput.value.split(' ')[0].toLowerCase()
		const firstLetter1 = textContent.charAt(0).toLowerCase()
		const firstLetter2 = inputValue.charAt(0).toLowerCase()
		const isValidInput = /^[a-zA-Z]+$/.test(inputValue)

		const wordExists = async (word: string, firstLetter: string) => {
			return await WordChecker(app, this.pathToWordSets, word, firstLetter)
		}

		if (isValidInput) {
			const word1Exists = await wordExists(textContent, firstLetter1)
			const word2Exists = await wordExists(inputValue, firstLetter2)

			if (word1Exists || word2Exists) {
				console.log(`marked: ${textContent} -> ${word1Exists}`)
				console.log(`marked: ${inputValue} -> ${word2Exists}`)
				const starSpan = document.createElement('span')
				label.appendChild(starSpan)
			}
		} else {
			const word1Exists = await wordExists(textContent, firstLetter1)

			if (word1Exists) {
				console.log(`marked: ${textContent} -> ${word1Exists}`)
				const starSpan = document.createElement('span')
				label.appendChild(starSpan)
			}
		}
	}

	async setForInputs(): Promise<void> {
		iterateLabels(
			this.container,
			async (label: HTMLLabelElement, inputs: HTMLInputElement[]) => {
				// const checkbox = inputs[0]
				const textInput = inputs[1]

				textInput.addEventListener('input', () => this.adjustInputWidth(textInput))
				textInput.removeEventListener('keyup', this.onInputKeyUp)
				textInput.addEventListener('keyup', this.onInputKeyUp)
				// textinput.removeEventListener('click', this.onInputClick)
				textInput.addEventListener('click', this.onInputClick)
				// 防止点击input触发label的active伪类
				textInput.addEventListener('mousedown', () => {
					label.classList.contains('sentence')
						? (label.style.backgroundColor = 'rgba(199, 43, 108, 0.08)')
						: (label.style.backgroundColor = '#ecefe8')
				})
				textInput.addEventListener('mouseup', () => {
					label.removeAttribute('style')
				})
				textInput.addEventListener('focus', () => {
					textInput.style.width = this.getInputTextWidth(textInput) + 16 * 1.5 + 'px'
				})
				textInput.addEventListener('blur', () => {
					this.adjustInputWidth(textInput)
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

			await this.updateInputValueInFile(labelText.value, oldValue, newValue, label.classList.contains('sentence'))
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
				this.wordMap.setKeyValue(`${delAttr}`, delText)
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
			this.container,
			async (label: HTMLLabelElement, inputs: HTMLInputElement[]) => {
				const textInput = inputs[1]

				textInput.removeEventListener('input', () => this.adjustInputWidth(textInput))
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
					textInput.style.width = this.getInputTextWidth(textInput) + 16 * 1.5 + 'px'
				})
				textInput.removeEventListener('blur', () => {
					this.adjustInputWidth(textInput)
				})
			})
	}

	// 替换源码模式下文本
	async updateInputValueInFile(
		labelText: string,
		oldValue: string,
		newValue: string,
		isSentence: boolean
	): Promise<void> {
		const fileContent = await this.app.vault.read(this.activeFile)
		const labelClass = isSentence ? ' class="sentence"' : ''

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
			`<label${labelClass}>${labelText}<input value=${quoteType}${newValue}${quoteType}></label>`
		)
		await this.app.vault.modify(this.activeFile, newFileContent)
		showNoticeForMatchCount(fileContent, regex)

		function getRegexForLabel(labelText: string, oldValue: string, labelClass: string): RegExp {
			const escapedLabelText = escapeRegExp(labelText)
			const escapedOldValue = escapeRegExp(oldValue)
			const escapedlabelClass = escapeRegExp(labelClass)

			let quoteType
			oldValue.includes('"') ? (quoteType = `'`) : (quoteType = `"`)
			const regexPattern = `<label${escapedlabelClass}>${escapedLabelText}<input value=${quoteType}${escapedOldValue}${quoteType}></label>`

			return new RegExp(regexPattern, 'g')
		}

		function showNoticeForMatchCount(fileContent: string, regex: RegExp): void {
			const matchCount = (fileContent.match(regex) || []).length
			if (matchCount === 1) {
				new Notice(`提示：笔记内容已修改`)
			} else if (matchCount > 1) {
				new Notice(`提醒：重复了 ${matchCount} 处`)
			} else if (matchCount < 1) {
				new Notice(`警告：未找到对应的label标签文本`)
			}
		}

		// 替换：加反斜杠变为特殊字符
		function escapeRegExp(str: string): string {
			return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		}
	}

	// 重置宽度
	adjustInputWidth(input: HTMLInputElement) {
		input.style.width = `${this.getInputTextWidth(input)}px`
	}

	// 计算宽度
	getInputTextWidth(input: HTMLInputElement): number {
		const d = document.createElement('span')
		d.innerText = input.value
		d.style.fontSize = window.getComputedStyle(input).getPropertyValue('font-size')
		d.style.fontFamily = window.getComputedStyle(input).getPropertyValue('font-family')
		d.style.visibility = 'hidden'
		d.style.whiteSpace = 'nowrap'
		d.style.padding = '0'
		document.body.appendChild(d)

		// 计算包括 letter-spacing 在内的实际文本宽度
		const letterSpacing = parseFloat(window.getComputedStyle(input).getPropertyValue('letter-spacing'))
		const paddingOffseValue =
			parseFloat(window.getComputedStyle(input).getPropertyValue('letter-spacing')) +
			parseFloat(window.getComputedStyle(input).getPropertyValue('padding-left'))
		const borderOffseValue =
			parseFloat(window.getComputedStyle(input).getPropertyValue('border-left')) +
			parseFloat(window.getComputedStyle(input).getPropertyValue('border-right'))

		const width = d.offsetWidth + letterSpacing * input.value.length + (paddingOffseValue + borderOffseValue)

		document.body.removeChild(d)
		return width + 16
	}

	clearEffectsOnEditorChange() {
		// TODO: 解决 “编辑源码后会强制改变checkboxinput装填” 问题
	}

	positionComment = () => {
		// TODO: 优化提示框textinput位置
	}

	drag(obj: HTMLElement): void {
		// 当鼠标在被拖拽元素上按下，开始拖拽
		obj.onmousedown = function (event: MouseEvent) {
			// 设置obj捕获所有的鼠标按下事件，而不仅仅是在元素内部区域
			// obj.setCapture && obj.setCapture();
			// 解决兼容性问题,实现IE8的兼容
			event = event || window.event
			// 鼠标在元素中的偏移量等于 鼠标的clientX - 元素的offsetLeft
			const ol = event.clientX - obj.offsetLeft
			const ot = event.clientY - obj.offsetTop

			// 为document绑定一个onmousemove事件
			document.onmousemove = function (event: MouseEvent) {
				event = event || window.event
				const left = event.clientX - ol
				const top = event.clientY - ot
				obj.style.left = left + 'px'
				obj.style.top = top + 'px'
			}

			// 为document绑定一个鼠标松开事件onmouseup
			document.onmouseup = function () {
				// 当鼠标松开时，被拖拽元素固定在当前位置
				// 当鼠标松开时，取消onmousemove事件
				document.onmousemove = null
				// 当鼠标松开时，onmouseup事件，要不每次一松开鼠标都触发此事件
				document.onmouseup = null
				// 鼠标松开，取消事件的捕获
				// obj.releaseCapture && obj.releaseCapture();
			}

			return false
		}
	}
}
