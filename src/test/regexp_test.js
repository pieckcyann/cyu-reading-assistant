const string = `<label>in some form or <label>fashion<input value="n. 方式"></label><input value="以某种形式或方式"></label>`

// 匹配最外层的<label>...</label>
const regExpLabel = /<label>(.*?)<\/label>/g

// 匹配<label>...</label>中的<input>
const regExpInput = /<input value=["']([^"']+)["']>/g

const labelMatches = string.matchAll(regExpLabel)
for (const labelMatch of labelMatches) {
    const labelContent = labelMatch[1]
    const inputMatches = labelContent.matchAll(regExpInput)
    for (const inputMatch of inputMatches) {
        console.log("整个标签:", labelMatch[0])
        console.log("输入值:", inputMatch[1])
    }
}
