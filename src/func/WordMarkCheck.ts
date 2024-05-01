import { App } from "obsidian"
import { WordComparedData } from "settings/Settings"

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

export function WordComparator(wordComparedDataArray: WordComparedData[], comparedWord: string): boolean {

    const firstLetter = comparedWord.charAt(0).toLowerCase()
    const dataItem = wordComparedDataArray.find(item => item.fileName === firstLetter)
    if (dataItem) {
        // 找到对应的 fileName，检查 fileContent 是否包含 comparedWord
        return dataItem.fileContent.includes(comparedWord)
    }

    // 如果没有找到对应的 fileName，则返回 false
    return false

}
