import { App, MarkdownRenderChild, Notice, TFile } from 'obsidian'
import { ReadAssistPluginSettings } from 'settings/Settings'
import { WordChecker } from 'WordChecker'
import { getWordCount } from 'WordCount'

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { ReactView } from 'component/ReactView'
import { createRoot } from 'react-dom/client'

export default class ReadAssistance extends MarkdownRenderChild {
	constructor(
		private app: App,
		public container: HTMLElement,
		public file: TFile,
		public filePath: string,
		public pathToWordSets: string,
		public settings: ReadAssistPluginSettings
	) {
		super(container)
		this.setForLabels()
	}

	async onload() {
		await this.setForInputs()
		this.registerEvents()
		this.wordCountDisplay()
	}

	unload() {
		const div = this.containerEl.querySelector('.reading h1 > div')
		if (div instanceof Element) {
			ReactDOM.unmountComponentAtNode(div)
		}
	}

	async wordCountDisplay() {
		const extractArticle = (input: string): string | null => {
			const regex = /^#{1,6}\s+(.+?)(?=\n\n(?:^#{1}\s+|$))/ms
			const match = input.match(regex)
			return match ? match[1] : null
		}

		const escapeHtmlString = (input: string): string => {
			// const words = input.trim().split(/\s+/)
			// return words.length
			return input.replace(/<[^>]*>/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		}

		const file = this.app.workspace.getActiveFile()
		if (!file) return

		const fileContent = await this.app.vault.read(file)
		const articleContent = extractArticle(fileContent)
		if (!articleContent) return

		const numberOfWord = getWordCount(escapeHtmlString(articleContent))
		const readpage = this.container.find('.reading h1')
		const div = document.createElement('div')
		readpage.appendChild(div)

		const root = createRoot(div)
		root.render(
			<React.StrictMode>
				<ReactView
					className="RA-count-display"
					textContent={numberOfWord + ' words'}
				/>
			</React.StrictMode>
		)
	}

	registerEvents() {
		this.iterateLabels(async (label, input) => {
			const textInput = input[1]
			this.registerDomEvent(label, 'click', async () => {
				this.adjustInputWidth(textInput)
			})
		})
	}

	private iterateLabels(
		callback: (label: HTMLLabelElement, inputs: HTMLInputElement[]) => void
	) {
		const labels = this.containerEl.findAll('label') as HTMLLabelElement[]
		for (const label of labels) {
			const directInputs = Array.from(label.children).filter(
				(child) => child.tagName === 'INPUT'
			) as HTMLInputElement[]
			const grandchildrenInputs = Array.from(
				label.querySelectorAll('label > input')
			) as HTMLInputElement[]
			const inputs = [...directInputs, ...grandchildrenInputs]
			callback(label, inputs)
		}
	}

	setForLabels() {
		this.iterateLabels(async (label, inputs) => {
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

	async setForInputs() {
		this.iterateLabels(async (label, inputs) => {
			// const checkbox = inputs[0]
			const textInput = inputs[1]
			// await this.adjustInputWidth(textInput)

			textInput.addEventListener('input', () =>
				this.adjustInputWidth(textInput)
			)
			textInput.removeEventListener('keyup', this.onInputKeyUp)
			textInput.addEventListener('keyup', this.onInputKeyUp)
			// textinput.removeEventListener('click', this.onInputClick)
			textInput.addEventListener('click', this.onInputClick)
			textInput.addEventListener('mousedown', () => {
				// 防止点击input触发label的active伪类
				label.classList.contains('sentence')
					? (label.style.backgroundColor = 'rgba(199, 43, 108, 0.08)')
					: (label.style.backgroundColor = '#ecefe8')
			})
			textInput.addEventListener('mouseup', () => {
				label.removeAttribute('style')
			})
			textInput.addEventListener('focus', () => {
				textInput.style.width =
					this.getInputTextWidth(textInput) + 16 * 1.5 + 'px'
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
		const textinput = event.target as HTMLInputElement
		const label = textinput.parentElement ?? null
		let labelText = (label?.textContent ?? '').trim()
		const oldValue = textinput.defaultValue
		const newValue = textinput.value

		if (label && event.key === 'Enter' && newValue.trim() !== oldValue.trim()) {
			event.preventDefault()
			event.stopPropagation()

			const del = label.querySelector('del')
			if (del) {
				const delTetxt = del.innerText
				labelText = labelText.replace(
					delTetxt,
					`<del data-prototype="${del.getAttribute(
						'data-prototype'
					)}">${delTetxt}</del>`
				)
			}

			await this.updateInputValueInFile(
				labelText,
				oldValue,
				newValue,
				label.classList.contains('sentence')
			)
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
		d.style.fontSize = window
			.getComputedStyle(input)
			.getPropertyValue('font-size')
		d.style.fontFamily = window
			.getComputedStyle(input)
			.getPropertyValue('font-family')
		d.style.visibility = 'hidden'
		d.style.whiteSpace = 'nowrap'
		d.style.padding = '0'
		document.body.appendChild(d)

		// 计算包括 letter-spacing 在内的实际文本宽度
		const letterSpacing = parseFloat(
			window.getComputedStyle(input).getPropertyValue('letter-spacing')
		)
		const paddingOffseValue =
			parseFloat(
				window.getComputedStyle(input).getPropertyValue('letter-spacing')
			) +
			parseFloat(
				window.getComputedStyle(input).getPropertyValue('padding-left')
			)
		const borderOffseValue =
			parseFloat(
				window.getComputedStyle(input).getPropertyValue('border-left')
			) +
			parseFloat(
				window.getComputedStyle(input).getPropertyValue('border-right')
			)

		const width =
			d.offsetWidth +
			letterSpacing * input.value.length +
			(paddingOffseValue + borderOffseValue)

		document.body.removeChild(d)
		return width + 16
	}

	// 替换源码模式下文本
	async updateInputValueInFile(
		labelText: string,
		oldValue: string,
		newValue: string,
		isSentence: boolean
	): Promise<void> {
		const fileContent = await this.app.vault.read(this.file)
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

		let replacementText
		newValue.includes('"')
			? (replacementText = `<label${labelClass}>${labelText}<input value='${newValue}'></label>`)
			: (replacementText = `<label${labelClass}>${labelText}<input value="${newValue}"></label>`)

		const newFileContent = fileContent.replace(regex, replacementText)
		await this.app.vault.modify(this.file, newFileContent)
		showNoticeForMatchCount(fileContent, regex)

		function getRegexForLabel(
			labelText: string,
			oldValue: string,
			labelClass: string
		): RegExp {
			const escapedLabelText = escapeRegExp(labelText)
			const escapedOldValue = escapeRegExp(oldValue)
			const escapedlabelClass = escapeRegExp(labelClass)
			let regexPattern = `<label${escapedlabelClass}>${escapedLabelText}<input value="${escapedOldValue}"></label>`
			if (oldValue.includes('"')) {
				regexPattern = `<label${escapedlabelClass}>${escapedLabelText}<input value='${escapedOldValue}'></label>`
			}
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
