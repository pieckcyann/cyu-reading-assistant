import { RowData } from "main"
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
    callback: (wordDataArray: RowData[]) => void
) {
    const lines = text.split("\n")
    const wordDataArray: RowData[] = []


    // const regExpText = `[\\s\\S]*?`
    const regExpText = `(?:(?!<[^>]+>).)*`

    const regExpSingleWord = new RegExp(
        `<label>(${regExpText})<input\\s+value=["']([^"']+)["']>\\s*<\\/label>`,
        'gm')

    const regExpNonPrototype = new RegExp(
        `<label>${regExpText}<del\\s+data-prototype=["']([^"']+)["']>${regExpText}<\\/del>${regExpText}<input\\s+value=["']([^"']+)["']><\\/label>`,
        'gm')

    const regExpSentence = new RegExp(
        // `<label class="sentence">((?:(?!<label class="sentence">).)*?(?=(<input\\s+value=["'][^"']+["']><\\/label>).)+)<input\\s+value=["']([^"']+)["']><\\/label>`,
        `<label class="sentence">([\\s\\S]*?)<input\\s+value=["']([^"']+)["'] class="sentence">\\s*<\\/label>`,
        'gm'
    )

    lines.forEach(
        async (lineContent: string, lineNumber: number) => {

            const matches: RowData[] = []

            // <label>meaning<input value="word"></label>
            const signleWordMatches = lineContent.matchAll(regExpSingleWord)
            for (const match of signleWordMatches) {
                if (match[1] && match[2]) {
                    const word = match[1]
                    const meaning = match[2]
                    matches.push({ word, meaning, isSentence: false })
                }
            }

            // <label>text<del data-prototype="word"></del>text<input value="meaning"></label>
            const nonPrototypeWordMatches = lineContent.matchAll(regExpNonPrototype)
            for (const match of nonPrototypeWordMatches) {
                if (match[1] && match[2]) {
                    const word = match[1]
                    const meaning = match[2]
                    matches.push({ word, meaning, isSentence: false })
                }
            }

            // <label class="sentence">word<input value="meaning"></label>
            const sentenceMatches = lineContent.matchAll(regExpSentence)
            for (const match of sentenceMatches) {
                if (match[1] && match[2]) {
                    const word = match[1].replace(/<[^>]+>/g, '')

                    const meaning = match[2]
                    matches.push({ word, meaning, isSentence: true })
                }
            }

            // Sort matches based on their appearance in lineContent
            const sortedMatches = matches.sort((a, b) => lineContent.indexOf(a.word) - lineContent.indexOf(b.word))

            // Push sorted matches to wordDataArray
            sortedMatches.forEach(({ word, meaning, isSentence }) => wordDataArray.push({ word, meaning, isSentence }))
        })

    callback(wordDataArray)

    // 使用 Promise 包装回调函数，等待其执行完成
    // await new Promise(resolve => {
    //     callback(wordDataArray)
    //     resolve(null)
    // })
}