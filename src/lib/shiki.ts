import { createHighlighter, type Highlighter } from 'shiki';

let _promise: Promise<Highlighter> | null = null;

export function getHighlighter(): Promise<Highlighter> {
    if (!_promise) {
        _promise = createHighlighter({
            themes: ['github-dark'],
            langs: ['javascript', 'typescript', 'jsx', 'tsx', 'html', 'css', 'json', 'bash']
        }).catch((e: unknown) => {
            _promise = null;
            return Promise.reject(e);
        });
    }
    return _promise;
}
