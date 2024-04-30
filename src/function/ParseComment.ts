import { WordData } from "main"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Notice } from "obsidian"

export function iterateLabels(
    containerEl: HTMLElement,
    callback: (label: HTMLLabelElement, inputs: HTMLInputElement[]) => void
) {
    const labels = containerEl.findAll('label') as HTMLLabelElement[]
    for (const label of labels) {
        const directInputs = Array.from(label.children).filter((child) => child.tagName === 'INPUT') as HTMLInputElement[]
        const grandchildrenInputs = Array.from(label.querySelectorAll('label > input')) as HTMLInputElement[]
        const inputs = [...directInputs, ...grandchildrenInputs]
        /**
         * const checkbox = inputs[0]
         * const textinput = inputs[1]
         */
        callback(label, inputs)
    }
}

/**
 * @deprecated
 */

export function getComments(
    containerEl: HTMLElement,
    callback: (word: string, meaning: string) => void
) {
    const labels = containerEl.findAll('label') as HTMLLabelElement[]
    for (const label of labels) {
        const directInputs = Array.from(label.children).filter((child) => child.tagName === 'INPUT') as HTMLInputElement[]
        const grandchildrenInputs = Array.from(label.querySelectorAll('label > input')) as HTMLInputElement[]
        const inputs = [...directInputs, ...grandchildrenInputs]

        let word = label.innerText
        const del = label.querySelector('del')
        if (del) {
            word = del.getAttribute('data-prototype') || word
        }

        const meaning = inputs[1].value
        callback(word, meaning)
    }
}

export async function parseActiveViewToComments(
    text: string,
    callback: (wordDataArray: WordData[]) => void
) {
    const lines = text.split("\n")
    const wordDataArray: WordData[] = []


    const regExpText = `[\\s\\S]*?`

    const regExpWord = new RegExp(
        `<label>(${regExpText})<input\\s+value=["']([^"']+)["']>\\s*<\\/label>`,
        'gm')

    const regExpNonPrototype = new RegExp(
        // `<del\\s+data-prototype=["']([^"']+)["']>([\\s\\S]*?)<\\/del>`,
        `<label>${regExpText}<del\\s+data-prototype=["']([^"']+)["']>${regExpText}<\\/del>${regExpText}<input\\s+value=["']([^"']+)["']><\\/label>`,
        'gm')

    const regExpSentence = new RegExp(
        `<label class="sentence">((?:(?=.*?<input\\s+value=["'][^"']+["']><\\/label>).)+)<input\\s+value=["']([^"']+)["']><\\/label>`,
        'gm')

    lines.forEach(
        async (lineContent: string, lineNumber: number) => {

            // <label>meaning<input value="word"></label>
            const signleWordMatches = lineContent.matchAll(regExpWord)
            for (const match of signleWordMatches) {
                if (match[1] && match[2]) {
                    const word = match[1]
                    const meaning = match[2]
                    wordDataArray.push({ word, meaning })
                }
            }

            // <label>text<del data-prototype="word"></del>text<input value="meaning"></label>
            const nonPrototypeWordMatches = lineContent.matchAll(regExpNonPrototype)
            for (const match of nonPrototypeWordMatches) {
                if (match[1] && match[2]) {
                    const word = match[1]
                    const meaning = match[2]
                    wordDataArray.push({ word, meaning })
                }
            }

            // <label class="sentence">word<input value="meaning"></label>
            const sentenceMatches = lineContent.matchAll(regExpSentence)
            for (const match of sentenceMatches) {
                if (match[1] && match[2]) {
                    const word = match[1]
                        .replace(regExpWord, '').replace('<label>', '')
                        .replace(regExpNonPrototype, '')

                    const meaning = match[2]
                    wordDataArray.push({ word, meaning })
                }
            }
        })

    callback(wordDataArray)

    // 使用 Promise 包装回调函数，并等待其执行完成
    // await new Promise(resolve => {
    //     callback(wordDataArray)
    //     resolve(null)
    // })
}