import * as React from "react";

export function createReactView(className: string) {
	return <ReactView className={className} />;
}

function ReactView({ className }: { className: string }) {
	return <h4 className={className}>Hello, React!</h4>;
}
