const note = {
	deckName: '示例卡组',
	modelName: '基础',
	fields: {
		front: '法国的首都是哪里？',
		back: '巴黎',
	},
	options: {
		allowDuplicate: false,
		duplicateScope: 'deck',
	},
	tags: ['地理'],
}

// 获取 fields 对象中的第一个字段（键值对）
const firstField = Object.entries(note.fields)[0]
const firstFieldKey = firstField[0] // 第一个字段的键
const firstFieldValue = firstField[1] // 第一个字段的值

console.log(firstField[1])
// console.log(`第一个字段的键是：${firstFieldKey}`)
// console.log(`第一个字段的值是：${firstFieldValue}`)
