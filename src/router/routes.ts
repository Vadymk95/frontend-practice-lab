export const RoutesPath = {
    Root: '/',
    DevPlayground: '/dev-playground',
    NotFound: '*'
} as const;

export type RoutePath = (typeof RoutesPath)[keyof typeof RoutesPath];
