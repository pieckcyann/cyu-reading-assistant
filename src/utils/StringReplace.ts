export function innerHTMLToTextContent(innerHTML: string): string {
	return (
		innerHTML
			// MD footnote syntax
			.replace(/<sup[\s\S]*?<\/sup>/g, '')
			// MD inline-code syntax
			.replace(`/<code class="code-styler-inline>([\\s\\S]*?)</code>"/g`, '$1')
			// HTML tag, must before replace MD footnote syntax
			.replace(/<[^>]+>/g, '')
			// &nbsp; -> normal space
			.replace(/&nbsp;/g, ' ')
	);
}

export function SourceTextToFieldWord(sourceText: string): string {
	return (
		clearMdFormatting(sourceText)
			// HTML tag
			.replace(/<[^>]+>/g, '')
			// Replace "Non-Breaking Space"
			.replace(/\u00A0/g, ' ')
	);
}

export function clearMdFormatting(mdString: string): string {
	return (
		mdString
			// MD emphasis (bold, italic, strikethrough)
			.replace(/([*_]{1,3})(\S.*?\S)\1/g, '$2')
			// MD links
			.replace(/\[(.*?)\]\(\)/g, '$1')
			// MD footnote
			.replace(/\[\^\d+\]/g, '')
			// MD inline code
			.replace(/`/g, '')
	);
}
