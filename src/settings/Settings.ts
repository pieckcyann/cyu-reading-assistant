import ReadAssistPlugin from "main"
import { PluginSettingTab, Setting } from "obsidian"
import { FolderSuggest } from "./suggesters/FolderSuggester"

export interface ReadAssistPluginSettings {
    word_sets_data: WordComparedData[]
    articles_folder: string,
    is_mark_star: boolean
}

export const DEFAULT_SETTINGS: ReadAssistPluginSettings = {
    word_sets_data: [],
    articles_folder: "",
    is_mark_star: false
}

export interface WordComparedData {
    fileName: string
    fileContent: string
}

export class ReadAssistSettingTab extends PluginSettingTab {
    constructor(private plugin: ReadAssistPlugin) {
        super(app, plugin)
    }

    display(): void {
        this.containerEl.empty()

        this.add_material_folder_setting()
        this.set_is_mark_star_setting()
    }

    set_is_mark_star_setting(): void {
        new Setting(this.containerEl)
            .setName(("是否显示标记"))
            .setDesc(("指定是否需要在阅读模式下显示标记的星星SVG"))
            .addToggle(toggle => toggle.setValue(this.plugin.settings.is_mark_star)
                .onChange((value) => {
                    this.plugin.settings.is_mark_star = value
                    this.plugin.saveSettings()
                    setTimeout(() => {
                        dispatchEvent(new Event("refresh-preview"))
                    }, 100)
                }))
    }


    add_material_folder_setting(): void {
        new Setting(this.containerEl)
            .setName("阅读素材位置")
            .setDesc("在这里指定英文文章的文件夹位置。")
            .addSearch((cb) => {
                new FolderSuggest(cb.inputEl)
                cb.setPlaceholder("示例：folder1/folder2")
                    .setValue(this.plugin.settings.articles_folder)
                    .onChange((new_folder) => {
                        this.plugin.settings.articles_folder = new_folder
                        this.plugin.saveSettings()
                    })
                // @ts-ignore
                cb.containerEl.addClass("templater_search")
            })
    }

}
