import { App } from "obsidian"
import { WordComparedData } from "settings/Settings"

// 检查 comparedWord 是否属于高亮单词（不区分大小写）
export async function WordChecker(app: App, pathToWordSets: string, comparedWord: string): Promise<string | null> {

    const files: Map<string, string> = await extractInfoFromWordsets(app, pathToWordSets)
    const firstLetter = comparedWord.charAt(0).toLowerCase()
    const CorrespondingWordSet: string = files.get(firstLetter) ?? ""

    // 构建全字匹配的正则表达式
    const regex = new RegExp(`\\b(${escapeRegExp(comparedWord)})\\b`, 'i') // 'i' 表示不区分大小写

    // 使用正则表达式进行匹配
    const match = CorrespondingWordSet.match(regex)
    if (match) {
        return match[0] // 返回匹配的部分
    } else {
        return null // 如果未找到匹配的部分，则返回 null
    }

    // 加反斜杠变为特殊字符
    function escapeRegExp(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
}


// 提取信息的函数
async function extractInfoFromWordsets(app: App, pathToWordSets: string): Promise<Map<string, string>> {
    const infoMap: Map<string, string> = new Map()
    // 获取 pathToWordSets
    const filePaths = (await app.vault.adapter.list(pathToWordSets)).files

    for (const filePath of filePaths) {
        const fileName = extractFileNameFromPath(filePath)
        const fileContent = (await app.vault.adapter.read(filePath)).toLowerCase()
        // 将目录名和文件内容存储到map中
        infoMap.set(fileName, fileContent)
    }

    function extractFileNameFromPath(path: string): string {
        const pathParts: string[] = path.split("/")
        const fileName: string = pathParts[pathParts.length - 1]
        return fileName
    }


    return infoMap
}

export async function extractWordComparedDatas(app: App, pathToWordSets: string): Promise<WordComparedData[]> {
    const wordComparedDataArray: WordComparedData[] = []
    // 获取 pathToWordSets
    const filePaths = (await app.vault.adapter.list(pathToWordSets)).files

    for (const filePath of filePaths) {
        const fileName = extractFileNameFromPath(filePath)
        const fileContent = (await app.vault.adapter.read(filePath)).toLowerCase()
        // 将目录名和文件内容存储到对象数组中
        wordComparedDataArray.push({ fileName, fileContent })
    }

    function extractFileNameFromPath(path: string): string {
        const pathParts: string[] = path.split("/")
        const fileName: string = pathParts[pathParts.length - 1]
        return fileName
    }

    return wordComparedDataArray
}
