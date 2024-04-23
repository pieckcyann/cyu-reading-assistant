import ReadAssistPlugin from "main"
import { MarkdownView, requireApiVersion } from "obsidian"
// import { getComments } from "core/WordCache"
import { ReadAssistPluginSettings } from "settings/Settings"


export async function createRow(
    word: string,
    meaning: string,
    wrapper_dom: HTMLElement,
    settings: ReadAssistPluginSettings,
) {

    const row_dom = wrapper_dom.createEl("div")
    row_dom.addClass("row")


    const word_column = row_dom.createEl("div")
    word_column.addClass("word-column")
    word_column.innerHTML = word

    const symbol_column = row_dom.createEl("div")
    symbol_column.addClass("symbol-column")
    symbol_column.innerHTML = "->"

    const meaning_column = row_dom.createEl("div")
    meaning_column.addClass("meaning-column")
    meaning_column.innerHTML = meaning

    row_dom.appendChild(word_column)
    row_dom.appendChild(symbol_column)
    row_dom.appendChild(meaning_column)

    wrapper_dom.appendChild(row_dom)
}

export function creatWrapper(
    container: HTMLElement,
    settings: ReadAssistPluginSettings
): void {
    const flashCardWrapper = container.querySelector(".flash-card-div")
    if (flashCardWrapper) return

    const flash_card_dom = createEl("div")
    flash_card_dom.addClass("flash-card-div")
    flash_card_dom.addClass("floating-right")
    container
        ?.querySelector(".markdown-source-view")
        ?.insertAdjacentElement("beforebegin", flash_card_dom)

    const wrapper_dom = flash_card_dom.createEl("div")
    wrapper_dom.addClass("flash-card-wrapper")
    wrapper_dom.onmouseenter = function () { flash_card_dom.addClass("hover") }
    wrapper_dom.onmouseleave = function () { flash_card_dom.removeClass("hover") }
    flash_card_dom.appendChild(wrapper_dom)

}

export function refresh_node(plugin: ReadAssistPlugin, view: MarkdownView): boolean {

    requireApiVersion("0.15.0")
        ? (activeDocument = activeWindow.document)
        : (activeDocument = window.document)

    const flash_card_dom = view.contentEl?.querySelector(".flash-card-div")
    if (flash_card_dom) {
        return true
    } else {
        return false
    }
}