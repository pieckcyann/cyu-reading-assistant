import { App } from 'obsidian';
import { WordComparedData } from 'settings/Settings';

export async function extractWordComparedDatas(
	app: App,
	pathToWordSets: string
): Promise<WordComparedData[]> {
	const wordComparedDataArray: WordComparedData[] = [];
	// 获取 pathToWordSets
	const filePaths = (await app.vault.adapter.list(pathToWordSets)).files;

	for (const filePath of filePaths) {
		const fileName = extractFileNameFromPath(filePath);
		const fileContent = (await app.vault.adapter.read(filePath)).toLowerCase();
		// 将目录名和文件内容存储到对象数组中
		wordComparedDataArray.push({ fileName, fileContent });
	}

	function extractFileNameFromPath(path: string): string {
		const pathParts: string[] = path.split('/');
		const fileName: string = pathParts[pathParts.length - 1];
		return fileName;
	}

	return wordComparedDataArray;
}

export function WordComparator(
	wordComparedDataArray: WordComparedData[],
	comparedWord: string
): boolean {
	const firstLetter = comparedWord.charAt(0).toLowerCase();
	// Find the word set corresponding to the first letter based on firstLetter
	const dataItem = wordComparedDataArray.find((item) => item.fileName === firstLetter);
	const dataArray = dataItem?.fileContent.split('\r\n') ?? '';
	for (const word of dataArray) {
		if (word === comparedWord) {
			return true;
		}
	}
	return false;
}
