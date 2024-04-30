const str = '<label class="sentence">Free <label>Shipping<input value="n. 运费;（总称）船舶; 航运，运输"></label> on orders over $29<input value="购物满 29 美元免运费"></label>'

const regExpSentence = new RegExp(
    '<label class="sentence">(.*?)<input value="(.*?)">(.*?)<input value="(.*?)">',
    'g'
)

const sentenceMatches = str.matchAll(regExpSentence)
for (const match of sentenceMatches) {
    if (match[1] && match[2]) {
        const word = match[1] // 预期匹配内容为：Free <label>Shipping<input value="n. 运费;（总称）船舶; 航运，运输"></label> on orders over $29
        const meaning = match[2] // 预期匹配内容为：购物满 29 美元免运费

        console.log(word)
        console.log(meaning)
    }
}