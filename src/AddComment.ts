import { Notice } from 'obsidian';
import { PromptModal } from "./PromptModal"
import { TemplaterError } from "utils/Error"

export async function addComment(isSentence: boolean): Promise<void> {
    const labelText = document.getSelection()?.toString().trim()
    if (!labelText) return

    const prompt = new PromptModal(
        "这里输入注释内容：",
        "",
        false
    );

    prompt.openAndGetValue(
        async (value: string) => {
            const commentText = value
            await addCommentInFile(labelText, commentText, isSentence)
        },
        (reason?: TemplaterError) => {
            new Notice('未输入注释内容!')
        }
    );
}

async function addCommentInFile(labelText: string, commentText: string, isSentence: boolean) {
    if (!labelText.trim() || !commentText.trim()) return

    const file = this.app.workspace.getActiveFile()
    if (!file) return

    const fileContent = await this.app.vault.read(file)
    const articleContent = extractArticle(fileContent)
    if (!articleContent) {
        new Notice(`警告：未匹配到规范的文章区域`)
        return
    }

    const startIndex = fileContent.indexOf(articleContent)
    const endIndex = startIndex + articleContent.length
    const labelClass = isSentence ? ' class="sentence"' : ''

    const replaceLabel = (text: string) => {
        return text.replace(
            labelText,
            `<label${labelClass}>${labelText}<input value="${commentText}"></label>`
        )
    }

    const newFileContent = fileContent.substring(0, startIndex) +
        replaceLabel(fileContent.substring(startIndex, endIndex)) +
        fileContent.substring(endIndex);

    if (newFileContent !== fileContent) {
        await this.app.vault.modify(file, newFileContent);
        new Notice(`提示：已修改`)
    } else {
        new Notice(`提示：未找到文本！`)
        // new Notice(`articleContent is ${articleContent}!`)
        // new Notice(`labelText is ${labelText}!`)
        // new Notice(`commentText is ${commentText}!`)
    }

    function extractArticle(input: string): string | null {
        // const regex = /^#\s+(.+?)(?=\n\n^#\s+)/ms
        // const regex = /^#\s+(.+?)(?=\n\n(?:^#\s+|$))/ms
        const regex = /^#{1,6}\s+(.+?)(?=\n\n(?:^#{1,6}\s+|$))/ms
        const match = input.match(regex)
        return match ? match[1] : null;
    }
}
