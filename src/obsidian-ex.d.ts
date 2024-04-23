import "obsidian"

declare module "obsidian" {
  interface TFile {
    deleted: boolean
  }

  // interface MarkdownView {
  //   onMarkdownFold(): void
  // }

  // interface MarkdownSubView {
  //   applyFoldInfo(foldInfo: FoldInfo): void
  //   getFoldInfo(): FoldInfo | null
  // }

}
