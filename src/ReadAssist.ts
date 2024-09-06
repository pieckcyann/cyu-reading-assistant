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
		// const activeLeafView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// if (!activeLeafView) return;
		// const wordCounter = activeLeafView.contentEl.querySelector('.ra-count-display');
		// if (wordCounter) return;
		mountWordCounter(this.containerEl);
	};

	registerEvents() {}

	onEditorChangeHandler = () => {
		/*
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
			(
				labelEl: HTMLLabelElement,
				textInputEl: HTMLInputElement,
				allChildElements: HTMLElement[],
				childLabels: HTMLLabelElement[]
			) => {
				textInputEl.setAttribute('data-isClicked', 'false');
				textInputEl.setAttribute('type', 'text');
				const isSentence = labelEl.classList.contains('sentence');

				let labelWord = '';
				parseFieldsFromPreview(
					labelEl.parentElement!,
					(_previewLabel: HTMLElement, previewWord: string, previewMeaning: string) => {
						if (textInputEl.value !== previewMeaning) {
							return;
						}
						labelWord = previewWord;
					}
				);

				// 通用事件处理函数
				const stopPropagation = (event: MouseEvent) => event.stopPropagation();

				// 阻止特定子元素事件冒泡
				allChildElements.forEach((child) => {
					if (
						(child.tagName.toLowerCase() === 'sup' &&
							child.classList.contains('footnote-ref')) ||
						child.tagName.toLowerCase() === 'del' ||
						child.classList.contains('footnote-link')
					) {
						child.addEventListener('mouseover', stopPropagation);
						child.addEventListener('mousedown', stopPropagation);

						child.addEventListener('click', (event: MouseEvent) => {
							const targetElement = event.target as HTMLElement;

							setTimeout(() => {
								const tippyBox = targetElement.nextElementSibling;
								if (!tippyBox) return;

								['mouseover', 'click', 'mousedown'].forEach((eventType) => {
									tippyBox.addEventListener(eventType, stopPropagation);
								});
							}, 200);
						});
					}
				});

				// 鼠标按下
				labelEl.addEventListener('mousedown', (event) => {
					event.stopPropagation();
					if (isSentence) {
						labelEl.addClass('label-active-sentence');
					} else {
						labelEl.addClass('label-active');
					}
				});

				// 鼠标抬起
				labelEl.addEventListener('mouseup', (event) => {
					event.stopPropagation();
					labelEl.classList.remove('label-active');
					labelEl.classList.remove('label-active-sentence');
				});

				labelEl.addEventListener('click', (event) => {
					const target = event.target as HTMLElement;
					const isFootNote =
						target.classList.contains('footnote-link') ||
						target.classList.contains('footnote-ref');
					if (isFootNote) return;

					// 修复嵌套label的点击事件混乱
					event.preventDefault();
					event.stopPropagation();
					const isClicked = textInputEl.getAttribute('data-isClicked') === 'true';
					// new Notice(`${target.classList}`);
					textInputEl.setAttribute('data-isClicked', isClicked ? 'false' : 'true');
					textInputEl.style.display = isClicked ? 'none' : 'inline-block';
					target.classList.toggle('cloze-hover', !isClicked);

					// 点击发音
					if (
						!isClicked &&
						labelEl.tagName.toLowerCase() === 'label' &&
						!labelEl.classList.contains('sentence')
					) {
						labelWord = labelWord.replace(/(\[\d{1,3}\])/g, '');
						this.wordSpeak(labelWord);
					}
				});

				let hoverTimeout1: number | undefined;
				let hoverTimeout2: number | undefined;

				// 鼠标移入
				labelEl.addEventListener('mouseover', (event) => {
					event.preventDefault();
					event.stopPropagation();
					const target = event.target as HTMLElement;
					const isFootNote =
						target.classList.contains('footnote-link') ||
						target.classList.contains('footnote-ref');
					if (isFootNote) return;

					if (textInputEl.getAttribute('data-isClicked') == 'false') {
						if (hoverTimeout2) {
							clearTimeout(hoverTimeout2); // 清除悬浮超时
							hoverTimeout2 = undefined;
						}

						hoverTimeout1 = window.setTimeout(() => {
							adjustInputWidth(textInputEl);
							target.classList.add('cloze-hover');
							const isEmTag = target.tagName.toLowerCase() === 'em';

							if (!isEmTag || !isSentence) {
								textInputEl.style.display = 'inline-block';
								labelEl.classList.add('underline-expand');
							}

							for (const label of childLabels) {
								label.style.paddingBottom = '0px';
							}

							labelEl.classList.add('wordLabelDel');

							adjustTextInput(event);
						}, 200);
					}
				});

				// 鼠标移出
				labelEl.addEventListener('mouseout', (event) => {
					event.preventDefault();
					event.stopPropagation();

					if (textInputEl.getAttribute('data-isClicked') == 'false') {
						if (hoverTimeout1) {
							clearTimeout(hoverTimeout1); // 清除悬浮超时
							hoverTimeout1 = undefined;
						}
						textInputEl.style.display = 'none';
						(event.target as HTMLElement).classList.remove('cloze-hover');
						labelEl.classList.remove('underline-expand');

						hoverTimeout2 = window.setTimeout(() => {
							for (const label of childLabels) {
								label.style.paddingBottom = '';
							}
							labelEl.classList.remove('wordLabelDel');
						}, 200);
					}
				});

				function adjustTextInput(event: MouseEvent) {
					const offsetX = 10;
					const offsetY = -50;
					const target = event.target as HTMLElement;

					const rect = target.getBoundingClientRect(); // 获取目标元素的边界框（相对于视口）
					const parent = textInputEl.offsetParent as HTMLElement; // 父 label
					const parentRect = parent.getBoundingClientRect(); // 获取父 label 的边界框（相对于视口）

					// 计算初始位置
					let left = rect.left - parentRect.left + offsetX;
					const top = rect.top - parentRect.top + offsetY;

					// 使用 requestAnimationFrame 确保位置调整在浏览器重绘之后进行
					requestAnimationFrame(() => {
						// 设置初始位置
						textInputEl.style.position = 'absolute';
						textInputEl.style.left = left + 'px';
						textInputEl.style.top = top + 'px';

						// 确保元素已渲染并计算其边界框
						const textInputRect = textInputEl.getBoundingClientRect();
						const windowWidth = window.innerWidth;

						// 检查右侧是否超出窗口右侧
						if (textInputRect.right > windowWidth) {
							left -= textInputRect.right - windowWidth;
							textInputEl.style.left = left + 'px';
						}
					});

					// 设置其中的 text input 宽度自适应
					adjustInputWidth(textInputEl);
				}

				// 右键点击复制
				labelEl.addEventListener('contextmenu', (event) => {
					event.preventDefault();
					event.stopPropagation();
					const copyText = labelEl.textContent ?? '';
					navigator.clipboard.writeText(copyText);
				});

				// 添加星标span
				parseFieldsFromPreview(
					labelEl.parentElement!,
					(_previewLabel: HTMLElement, previewWord: string, previewMeaning: string) => {
						if (textInputEl.value !== previewMeaning) {
							return;
						}

						if (this.settings.is_mark_star == true) {
							const isMarked = WordComparator(this.settings.word_sets_data, previewWord);
							if (isMarked) {
								const starSpan = document.createElement('span');
								starSpan.addClass('ra-star');
								labelEl.appendChild(starSpan);
							}
						}
					}
				);
			}
		);
	}

	async setForInputs(): Promise<void> {
		iterateLabelsAndInputs(
			this.containerEl,
			async (label: HTMLLabelElement, textInput: HTMLInputElement) => {
				textInput.addEventListener('input', () => {
					adjustInputWidth(textInput);
				});
				textInput.removeEventListener('keyup', this.onInputKeyUp);
				textInput.addEventListener('keyup', this.onInputKeyUp);
				textInput.addEventListener('click', this.onInputClick);
				// 防止点击input触发label的active伪类(仅从显示效果上)
				textInput.addEventListener('mousedown', (event) => {
					event.stopPropagation();
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

	private onInputClick = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
	};

	private onInputKeyUp = async (event: KeyboardEvent) => {
		const textInput = event.target as HTMLInputElement;
		const label = textInput.parentElement ?? null;
		const oldValue = textInput.defaultValue;
		const newValue = textInput.value;

		if (label && event.key === 'Enter' && newValue.trim() !== oldValue.trim()) {
			// 更新 ob 中的 input.value
			await updateInputValueInFile(this.app, oldValue, newValue);

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
					new Notice('Warning: 查找单词与含义时出错！');
				}
			}
		}
	};

	async removeInputListeners(): Promise<void> {
		iterateLabelsAndInputs(
			this.containerEl,
			async (label: HTMLLabelElement, textInput: HTMLInputElement) => {
				textInput.removeEventListener('input', () => adjustInputWidth(textInput));
				textInput.removeEventListener('keyup', this.onInputKeyUp);
				textInput.removeEventListener('click', this.onInputClick);
				textInput.removeEventListener('mousedown', (event) => {
					event.stopPropagation();
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
		speech.volume = 1; // 音量 0 to 1
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
