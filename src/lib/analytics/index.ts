import type { AnalyticsEventName, AnalyticsEventPayloads } from './events';

declare global {
    interface Window {
        gtag?: (command: 'event', eventName: string, params?: Record<string, unknown>) => void;
    }
}

export const track = <T extends AnalyticsEventName>(
    event: T,
    params?: AnalyticsEventPayloads[T]
): void => {
    window.gtag?.('event', event, params as Record<string, unknown>);
};
