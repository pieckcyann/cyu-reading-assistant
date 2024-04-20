import React from 'react'

interface ReactViewProps {
	className?: string
	textContent?: string // 添加问号表示 textContent 是可选的
}

export const ReactView: React.FC<ReactViewProps> = ({
	className = 'RA-count-display',
	textContent = 'Hello, React!',
}) => {
	return <span className={className}>{textContent}</span>
}

// export function createReactView(className: string) {
// 	return <ReactView className={className} />;
// }
