import ReadAssistPlugin from "main";
import { PluginSettingTab, Setting } from "obsidian";
import { FolderSuggest } from "./suggesters/FolderSuggester";

export interface ReadAssistPluginSettings {
    mySetting: string;
    articles_folder: string,
    user_scripts_folder: string;

}

export const DEFAULT_SETTINGS: ReadAssistPluginSettings = {
    mySetting: 'default',
    articles_folder: "",
    user_scripts_folder: "",

}

export class ReadAssistSettingTab extends PluginSettingTab {
    constructor(private plugin: ReadAssistPlugin) {
        super(app, plugin);
    }

    display(): void {

        this.containerEl.empty();

        this.add_material_folder_setting();

        // new Setting(this.containerEl)
        //     .setName('Setting #1')
        //     .setDesc('It\'s a secret')
        //     .addText(text => text
        //         .setPlaceholder('Enter your secret')
        //         .setValue(this.plugin.settings.mySetting)
        //         .onChange(async (value) => {
        //             this.plugin.settings.mySetting = value;
        //             await this.plugin.saveSettings();
        //         }));
    }


    add_material_folder_setting(): void {
        new Setting(this.containerEl)
            .setName("阅读素材位置")
            .setDesc("在这里指定英文文章的文件夹位置。")
            .addSearch((cb) => {
                new FolderSuggest(cb.inputEl);
                cb.setPlaceholder("示例：folder1/folder2")
                    .setValue(this.plugin.settings.articles_folder)
                    .onChange((new_folder) => {
                        this.plugin.settings.articles_folder = new_folder;
                        this.plugin.saveSettings();
                    });
                // @ts-ignore
                cb.containerEl.addClass("templater_search");
            });
    }

}
