
// 重置宽度
export function adjustInputWidth(input: HTMLInputElement) {
    input.style.width = `${getInputTextWidth(input)}px`
}

// 计算宽度
export function getInputTextWidth(input: HTMLInputElement): number {
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
