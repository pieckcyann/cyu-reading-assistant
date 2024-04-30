import { Notice } from "obsidian"

export function notice(message: string | DocumentFragment, duration?: number) {
    if (typeof message === 'string') {
        new Notice(`[read-assist] ${message}`, duration)
    } else {
        const paraString = String(message)
        new Notice(`[read-assist] ${paraString}`, duration)
    }
}