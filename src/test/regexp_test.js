/* eslint-disable no-irregular-whitespace */
/* eslint-disable @typescript-eslint/no-unused-vars */
const string =
    `<label>For years<input value="多年以来"></label>`
// `<label anki-id="112141321421">For years<input value="多年以来"></label>`

const regExpText = `(?:(?!<[^>]+>).)*`

const regExpSingleWord = new RegExp(
    // `<label>(${regExpText})<input value=["']([^"']+)["']><\\/label>`,
    `<label(?:\\s+anki-id=["'](\\d+)["'])?>(${regExpText})<input value=["']([^"']+)["']><\\/label>`,
    'gm'
)

const signleWordMatches = string.matchAll(regExpSingleWord)

for (const match of signleWordMatches) {
    const isExistAnki = !!match[1]
    console.log(isExistAnki)
}

// console.log(word)


// console.log(
//     "Avoid N+1 via Common Table Expressions in databases that support them" === "Avoid N+1 via Common Table Expressions in databases that support them"
// )