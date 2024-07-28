export interface AnkiConnectNote {
	deckName: string;
	modelName: string;
	fields: Record<string, string>; // 卡片的所有字段
	options: {
		allowDuplicate: boolean;
		duplicateScope: string;
	};
	tags: Array<string>;
}

export interface AnkiConnectNoteAndID {
	fields: Record<string, string>;
	identifier: number;
}
