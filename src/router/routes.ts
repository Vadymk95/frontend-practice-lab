export const RoutesPath = {
    Root: '/',
    DevPlayground: '/dev-playground',
    SessionPlay: '/session/play',
    SessionSummary: '/session/summary',
    NotFound: '*'
} as const;

export type RoutePath = (typeof RoutesPath)[keyof typeof RoutesPath];
