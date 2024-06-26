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

export function parseAllComments(
    containerEl: HTMLElement,
    callback: (label: HTMLElement, word: string, meaning: string) => void
) {
    const labels = containerEl.findAll('label') as HTMLLabelElement[]
    for (const label of labels) {
        const directInputs = Array.from(label.children).filter((child) => child.tagName === 'INPUT') as HTMLInputElement[]
        const grandchildrenInputs = Array.from(label.querySelectorAll('label > input')) as HTMLInputElement[]
        const inputs = [...directInputs, ...grandchildrenInputs]

        let word = label.innerText
        let meaning = inputs[1].value

        const del = label.querySelector('del')
        if (del) {
            word = del.getAttribute('data-prototype') || word
        }

        if (label.classList.contains('sentence')) {
            word = label.innerHTML
                .replace(/<sup[\s\S]*?<\/sup>/g, "")   // MD footnote syntax
                .replace(/<[^>]+>/g, '')               // HTML tag, ,must before replace MD footnote syntax
                .replace(/&nbsp;/g, ' ')               // &nbsp; -> normal space

            meaning = (label.findAllSelf('input.sentence')[0] as HTMLInputElement).value

        }

        if (label.classList.contains('nested')) {
            word = label.innerHTML.replace(/<[^>]+>/g, '')
            meaning = (label.findAllSelf('input.nested')[0] as HTMLInputElement).value
        }

        callback(label, word, meaning)
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
        `<label>(${regExpText})<input value=["']([^"']+)["']><\\/label>`,
        'gm'
    )

    const regExpNestedWord = new RegExp(
        `<label class="nested">([\\s\\S]*?)<input value=["']([^"']+)["'] class="nested">\\s*<\\/label>`,
        'gm'
    )

    const regExpNonPrototype = new RegExp(
        `<label>${regExpText}<del data-prototype=["']([^"']+)["']>${regExpText}<\\/del>${regExpText}<input\\s+value=["']([^"']+)["']><\\/label>`,
        'gm'
    )

    const regExpDoubleQuoteSentence = new RegExp(
        `<label class="sentence">([\\s\\S]*?)<input value=["]([^"]+)["] class="sentence">\\s*<\\/label>`,
        'gm'
    )

    const regExpSingleQuoteSentence = new RegExp(
        `<label class="sentence">([\\s\\S]*?)<input value=[']([^']+)['] class="sentence">\\s*<\\/label>`,
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
                    matches.push({ word, meaning, line: lineNumber, isSentence: false })
                }
            }

            // <label><label>meaning<input value=""></label><input value=""></label>
            const nestedWordMatches = lineContent.matchAll(regExpNestedWord)
            for (const match of nestedWordMatches) {
                if (match[1] && match[2]) {
                    const word = match[1].replace(/<[^>]+>/g, '')

                    const meaning = match[2]
                    matches.push({ word, meaning, line: lineNumber, isSentence: false })
                }
            }

            // <label>text<del data-prototype="word"></del>text<input value="meaning"></label>
            const nonPrototypeWordMatches = lineContent.matchAll(regExpNonPrototype)
            for (const match of nonPrototypeWordMatches) {
                if (match[1] && match[2]) {
                    const word = match[1]
                    const meaning = match[2]
                    matches.push({ word, meaning, line: lineNumber, isSentence: false })
                }
            }

            // <label class="sentence">word<input value="meaning"></label>
            // <label class="sentence">word<input value='meaning'></label>
            const sentenceMatches = [...lineContent.matchAll(regExpDoubleQuoteSentence), ...lineContent.matchAll(regExpSingleQuoteSentence)]
            for (const match of sentenceMatches) {
                if (match[1] && match[2]) {
                    const word = match[1]
                        .replace(/<[^>]+>/g, '')            // HTML tag
                        .replace(/\[(.*?)\]\(\)/g, "$1")    // MD links syntax
                        .replace(/\[\^\d+\]/g, "")          // MD footnote syntax
                        .replace(/\u00A0/g, ' ')            // Replace "Non-Breaking Space"


                    const meaning = match[2]
                    matches.push({ word, meaning, line: lineNumber, isSentence: true })
                }
            }

            // Sort matches based on their appearance in lineContent
            const sortedMatches =
                matches.sort((a, b) => {
                    const indexA = lineContent.indexOf(a.meaning) // Sort by a.meaning instead of a.word
                    const indexB = lineContent.indexOf(b.meaning)
                    return indexA - indexB
                })

            // Push sorted matches to wordDataArray
            sortedMatches.forEach(({ word, meaning, line, isSentence }) => wordDataArray.push({ word, meaning, line, isSentence }))
        })

    callback(wordDataArray)

    // 使用 Promise 包装回调函数，等待其执行完成
    // await new Promise(resolve => {
    //     callback(wordDataArray)
    //     resolve(null)
    // })
}