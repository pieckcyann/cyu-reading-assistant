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
        // const checkbox = inputs[0]
        // const textinput = inputs[1]
    }
}

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