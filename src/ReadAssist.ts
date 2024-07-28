import { App, MarkdownRenderChild, MarkdownView, Notice, TFile } from 'obsidian';
import { ReadAssistPluginSettings } from 'settings/Settings';
import { WordComparator } from 'func/WordMarkCheck';
import { iterateLabelsAndInputs, parseFieldsFromPreview } from './func/ParseComment';
import { mountWordCounter, unmountWordCounter } from './components/WordCounter';

import { adjustInputWidth, getInputTextWidth } from './func/InputAdjuest';
import { ExportManager } from 'func/ExportWordsToAnki';
import { updateInputValueInFile } from 'func/UpdateMdFile';

export default class ReadAssistance extends MarkdownRenderChild {
	app: App;
	activeFile: TFile;

	constructor(
		app: App,
		activeFile: TFile,
		public activeLeafView: MarkdownView,
		public renderedDiv: HTMLElement,
		public pathToWordSets: string,
		public settings: ReadAssistPluginSettings
	) {
		super(renderedDiv);
		this.app = app;
		this.activeFile = activeFile;
	}

	async onload() {
		this.setForLabels();
		this.setForInputs();
		this.registerEvents();

		this.renderCounter();
	}

	unload() {
		this.removeInputListeners();
		unmountWordCounter(this.containerEl);
	}

	renderCounter = () => {
		// const wordCounter = this.containerEl.querySelector(
		// 	'.ra-count-display'
		// ) as HTMLElement;
		// mountWordCounter(this.containerEl);

		// console.log(activeLeafView.containerEl);

		// const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// if (!activeLeafView) return;
		// const wordCounter = activeLeafView.contentEl.querySelector('.ra-count-display');
		// if (wordCounter) return;

		mountWordCounter(this.containerEl);
	};

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
	};

	onFileChangeHandler = () => {
		this.onEditorChangeHandler();
	};

	onActiveLeafChangeHandler = () => {
		this.onEditorChangeHandler();
	};

	setForLabels() {
		iterateLabelsAndInputs(
			this.containerEl,
			async (label: HTMLLabelElement, inputs: HTMLInputElement[]) => {
				if (inputs.length > 0) {
					const checkboxInput = document.createElement('input');
					checkboxInput.type = 'checkbox';
					label.insertBefore(checkboxInput, inputs[0]);
					inputs[0].type = 'text';

					let textInput: HTMLInputElement;
					if (
						label.classList.contains('sentence') ||
						label.classList.contains('nested')
					) {
						textInput = inputs[inputs.length - 1];
					} else {
						textInput = inputs[1];
					}

					let labelWord = '';

					parseFieldsFromPreview(
						label.parentElement!,
						(_previewLabel: HTMLElement, previewWord: string, previewMeaning: string) => {
							if (textInput.value !== previewMeaning) {
								return;
							}
							labelWord = previewWord;
						}
					);

					// 修复嵌套label的点击事件混乱
					label.addEventListener('click', (event) => {
						event.preventDefault();
						event.stopPropagation();
						if (checkboxInput) {
							checkboxInput.checked = !checkboxInput.checked;
						}
						const labelTag = event.target as HTMLLabelElement;

						const offsetX = 10;
						const offsetY = 130;
						const left = event.clientX + offsetX + 'px';
						const top = event.clientY - offsetY + 'px';
						textInput.style.left = left;
						textInput.style.top = top;

						// 设置其中的 text input 宽度自适应
						adjustInputWidth(textInput);

						// 点击发音
						if (checkboxInput.checked && !labelTag.className.contains('sentence')) {
							this.wordSpeak(labelWord);
						}
					});

					// 右键点击复制
					label.addEventListener('contextmenu', (event) => {
						event.preventDefault();
						event.stopPropagation();
						const copyText = label.textContent ?? '';
						navigator.clipboard.writeText(copyText);
					});

					// 添加星标span
					parseFieldsFromPreview(
						label.parentElement!,
						(_previewLabel: HTMLElement, previewWord: string, previewMeaning: string) => {
							if (textInput.value !== previewMeaning) {
								return;
							}

							if (this.settings.is_mark_star == true) {
								const isMarked = WordComparator(
									this.settings.word_sets_data,
									previewWord
								);
								if (isMarked) {
									const starSpan = document.createElement('span');
									starSpan.addClass('ra-star');
									label.appendChild(starSpan);
								}
							}
						}
					);
				}
			}
		);
	}

	async setForInputs(): Promise<void> {
		iterateLabelsAndInputs(
			this.containerEl,
			async (label: HTMLLabelElement, inputs: HTMLInputElement[]) => {
				const textInput = inputs[1];

				textInput.addEventListener('input', () => {
					adjustInputWidth(textInput);
				});
				textInput.removeEventListener('keyup', this.onInputKeyUp);
				textInput.addEventListener('keyup', this.onInputKeyUp);
				textInput.addEventListener('click', this.onInputClick);
				// 防止点击input触发label的active伪类
				textInput.addEventListener('mousedown', () => {
					label.classList.contains('sentence')
						? (label.style.backgroundColor = 'rgba(1199, 43, 108, 0.06)')
						: (label.style.backgroundColor = '#ecefe8');
				});
				textInput.addEventListener('mouseup', () => {
					label.removeAttribute('style');
				});
				textInput.addEventListener('focus', () => {
					textInput.style.width = getInputTextWidth(textInput) + 16 * 1.5 + 'px';
				});
				textInput.addEventListener('blur', () => {
					adjustInputWidth(textInput);
				});
			}
		);
	}

	private onInputClick = async (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
	};

	private onInputKeyUp = async (event: KeyboardEvent) => {
		const textInput = event.target as HTMLInputElement;
		const label = textInput.parentElement ?? null;
		/* eslint-disable prefer-const */
		let labelText = { value: label?.textContent ?? '' };
		const oldValue = textInput.defaultValue;
		const newValue = textInput.value;

		if (label && event.key === 'Enter' && newValue.trim() !== oldValue.trim()) {
			event.preventDefault();
			event.stopPropagation();

			checkChildrenLabelTag(label, labelText);
			checkChildrenDelTag(label, labelText);
			checkChildrenStrongTag(label, labelText);

			await updateInputValueInFile(
				this.app,
				labelText.value,
				oldValue,
				newValue,
				label.classList.contains('sentence'),
				label.classList.contains('nested'),
				label.hasAttribute('data-anki-id') ? label.getAttribute('data-anki-id') : ''
			);

			// 同时更新 anki 中的字段
			if (label.hasAttribute('data-anki-id')) {
				const em = new ExportManager(this.app, this.settings);
				let isFinded = false;

				parseFieldsFromPreview(
					label.parentElement!,
					(_previewLabel: HTMLElement, previewWord: string, previewMeaning: string) => {
						if (newValue !== previewMeaning) {
							return;
						}
						em.exportSingleWordsToAnki({
							word: previewWord,
							meaning: newValue,
							// isSentence: label.classList.contains('sentence'),
							// isMarked: WordComparator(this.settings.word_sets_data, word ?? ''),
							ankiID: Number(label.getAttribute('data-anki-id')),
						});
						isFinded = true;
					}
				);

				if (!isFinded) {
					new Notice('查找单词与含义时出错！');
				}
			}
		}

		function checkChildrenDelTag(label: HTMLElement, labelTextObj: { value: string }) {
			const del = label.querySelector('del');
			if (del) {
				const delText = del.innerText;
				const delAttr = del.getAttribute('data-prototype');
				labelTextObj.value = labelTextObj.value.replace(
					delText,
					`<del data-prototype="${delAttr}">${delText}</del>`
				);
			}
		}

		function checkChildrenLabelTag(label: HTMLElement, labelTextObj: { value: string }) {
			const childrenLabels = label.querySelectorAll('label');
			if (childrenLabels.length > 0) {
				childrenLabels.forEach((childrenLabel) => {
					let childrenLabelText = {
						value: childrenLabel?.textContent ?? '',
					};
					const childrenInputText =
						(childrenLabel.querySelector('input[type="text"]') as HTMLInputElement)
							?.value || '';
					let quoteType;
					newValue.includes('"') ? (quoteType = `'`) : (quoteType = `"`);
					let ankiID = childrenLabel.hasAttribute('data-anki-id')
						? ` data-anki-id="${childrenLabel.getAttribute('data-anki-id')}"`
						: '';
					labelTextObj.value = labelTextObj.value.replace(
						childrenLabelText.value,
						`<label${ankiID}>${childrenLabelText.value}<input value=${quoteType}${childrenInputText}${quoteType}></label>`
					);
					checkChildrenDelTag(childrenLabel, childrenLabelText);
				});
			}
		}

		function checkChildrenStrongTag(label: HTMLElement, labelTextObj: { value: string }) {
			const strongTags = label.querySelectorAll('strong');
			strongTags.forEach((strong) => {
				const strongText = strong.innerText;
				labelTextObj.value = labelTextObj.value.replace(strongText, `**${strongText}**`);
			});
		}
	};

	async removeInputListeners(): Promise<void> {
		iterateLabelsAndInputs(
			this.containerEl,
			async (label: HTMLLabelElement, inputs: HTMLInputElement[]) => {
				const textInput = inputs[1];

				textInput.removeEventListener('input', () => adjustInputWidth(textInput));
				textInput.removeEventListener('keyup', this.onInputKeyUp);
				textInput.removeEventListener('click', this.onInputClick);
				textInput.removeEventListener('mousedown', () => {
					label.classList.contains('sentence')
						? (label.style.backgroundColor = 'rgba(199, 43, 108, 0.08)')
						: (label.style.backgroundColor = '#ecefe8');
				});
				textInput.removeEventListener('mouseup', () => {
					label.removeAttribute('style');
				});
				textInput.removeEventListener('focus', () => {
					textInput.style.width = getInputTextWidth(textInput) + 16 * 1.5 + 'px';
				});
				textInput.removeEventListener('blur', () => {
					adjustInputWidth(textInput);
				});
			}
		);
	}

	wordSpeak(word: string) {
		var speech = new SpeechSynthesisUtterance();
		speech.text = word;
		speech.volume = 0.9; // 音量 0 to 1
		speech.rate = 1; // 语速 0.1 to 9
		speech.pitch = 1; // 音高 0 to 2, 1=normal
		// speech.voice = window.speechSynthesis.getVoices().filter((v) => v.lang == 'en-GB')[0];
		speech.voice = window.speechSynthesis.getVoices().filter((v) => v.lang == 'en-US')[0];
		speechSynthesis.cancel();
		speechSynthesis.speak(speech);
	}

	clearEffectsOnEditorChange() {
		// TODO: 解决 “编辑源码后会强制改变checkboxinput状态” 问题
	}

	positionComment = () => {
		// TODO: 优化提示框textinput位置
	};
}
