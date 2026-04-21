import { loadEnv, type Plugin } from 'vite';

/**
 * Strips the Google Analytics block from index.html when `VITE_GA_ID` is unset
 * at build time. Otherwise Vite would leave the literal `%VITE_GA_ID%` placeholder
 * in the <script> URL, resulting in a wasted GTM request with a garbage id.
 *
 * The GA block is delimited by `<!-- GA:START -->` and `<!-- GA:END -->` markers
 * in index.html.
 */
export const htmlGaGate = (): Plugin => {
    let gaEnabled = false;

    return {
        name: 'html-ga-gate',
        config(_config, { mode }) {
            const env = loadEnv(mode, process.cwd(), 'VITE_');
            gaEnabled = Boolean(env.VITE_GA_ID);
        },
        transformIndexHtml: {
            order: 'pre',
            handler(html) {
                if (gaEnabled) return html;
                return html.replace(/[\t ]*<!-- GA:START -->[\s\S]*?<!-- GA:END -->\n?/, '');
            }
        }
    };
};
