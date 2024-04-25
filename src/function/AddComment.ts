import { Editor, EditorPosition, Notice } from 'obsidian'
import { PromptModal } from "../components/PromptModal"
import { TemplaterError } from "utils/Error"
// import escapeHTML from 'escape-html';

export function addCommentForSource({
    containerTag,
    containerTagClass,
    editor
}: {
    containerTag: string,
    containerTagClass: string,
    editor: Editor
}) {
    const selection = editor.getSelection()
    if (selection.contains('\n')) return

    // const escapedSelection = escapeHTML(selection);
    const escapedSelection = selection
    const replacement = `<${containerTag}${containerTagClass}>${escapedSelection}<input value="comments"></${containerTag}>`

    if (replacement) {
        const currentCursor = editor.getCursor("from")
        const placeholderPositionStartCh = currentCursor.ch + escapedSelection.length + containerTag.length + containerTagClass.length + 16
        const placeholderPositionEndCh = placeholderPositionStartCh + 8
        const placeholderPositionStart: EditorPosition = { line: currentCursor.line, ch: placeholderPositionStartCh }
        const placeholderPositionEnd: EditorPosition = { line: currentCursor.line, ch: placeholderPositionEndCh }
        editor.replaceSelection(replacement, selection)
        editor.setSelection(placeholderPositionStart, placeholderPositionEnd)
    }
}

export async function addCommentForPreview({
    containerTag,
    containerTagClass
}: {
    containerTag: string,
    containerTagClass: string
}) {
    const labelText = document.getSelection()?.toString().trim()
    if (!labelText) return

    const prompt = new PromptModal(
        "这里输入注释内容：",
        "",
        false
    )

    prompt.openAndGetValue(
        async (value: string) => {
            const commentText = value
            await addCommentInFile({
                labelText: labelText,
                containerTagClass: containerTagClass,
                commentText: commentText,
                containerTag: containerTag
            })
        },
        (_?: TemplaterError) => {
            new Notice('未输入注释内容!')
        }
    )
}

async function addCommentInFile({
    labelText,
    containerTagClass,
    commentText,
    containerTag
}: {
    labelText: string,
    containerTagClass: string,
    commentText: string,
    containerTag: string
}) {
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

    const replaceLabel = (text: string) => {
        return text.replace(
            labelText,
            `<${containerTag}${containerTagClass}>${labelText}<input value="${commentText}"></${containerTag}>`
        )
    }

    const newFileContent = fileContent.substring(0, startIndex) +
        replaceLabel(fileContent.substring(startIndex, endIndex)) +
        fileContent.substring(endIndex)

    if (newFileContent !== fileContent) {
        await this.app.vault.modify(file, newFileContent)
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
        const regex = /^#{1,6}\s+(.+?)(?=\n\n(?:^#{1}\s+|$))/ms
        const match = input.match(regex)
        return match ? match[1] : null
    }
}
