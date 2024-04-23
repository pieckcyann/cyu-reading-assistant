// class WordDataManager {
//     private keyValueMap: Map<string, number>

//     constructor() {
//         this.keyValueMap = new Map<string, number>()
//     }

//     public setKeyValue(key: string, value: number): void {
//         this.keyValueMap.set(key, value)
//     }

//     public getKeyValue(key: string): number | undefined {
//         return this.keyValueMap.get(key)
//     }

//     public getAllKeyValuePairs(): Map<string, number> {
//         return this.keyValueMap
//     }
// }

// export default WordDataManager

export function iterateLabels(
    containerEl: HTMLElement,
    callback: (label: HTMLLabelElement, inputs: HTMLInputElement[]) => void
) {
    const labels = containerEl.findAll('label') as HTMLLabelElement[]
    for (const label of labels) {
        const directInputs = Array.from(label.children).filter((child) => child.tagName === 'INPUT') as HTMLInputElement[]
        const grandchildrenInputs = Array.from(label.querySelectorAll('label > input')) as HTMLInputElement[]
        const inputs = [...directInputs, ...grandchildrenInputs]
        callback(label, inputs)
    }
}

export function getComments(
    containerEl: HTMLElement,
    callback: (word: string, comment: string) => void
) {
    const labels = containerEl.findAll('label') as HTMLLabelElement[]
    for (const label of labels) {
        const directInputs = Array.from(label.children).filter((child) => child.tagName === 'INPUT') as HTMLInputElement[]
        const grandchildrenInputs = Array.from(label.querySelectorAll('label > input')) as HTMLInputElement[]
        const inputs = [...directInputs, ...grandchildrenInputs]
        callback(label.innerText, inputs[1].value)
    }
}