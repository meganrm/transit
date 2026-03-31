const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;
const DEFAULT_BASE_URL = "/";
const DUMMY_ORIGIN = "https://example.invalid";

function normalizeBasePath(baseUrl: string | undefined): string {
    return new URL(baseUrl || DEFAULT_BASE_URL, DUMMY_ORIGIN).pathname;
}

export function resolveRouteDataUrl(
    rawUrl: string | undefined,
    baseUrl: string | undefined,
): string | undefined {
    const trimmedUrl = rawUrl?.trim();
    if (!trimmedUrl) return undefined;
    if (ABSOLUTE_URL_PATTERN.test(trimmedUrl)) return trimmedUrl;

    const normalizedBasePath = normalizeBasePath(baseUrl);
    const basePathWithoutLeadingSlash = normalizedBasePath.replace(/^\//, "");
    const trimmedWithoutDotPrefix = trimmedUrl.replace(/^\.\//, "");

    if (trimmedUrl.startsWith(normalizedBasePath)) {
        return trimmedUrl;
    }

    if (trimmedWithoutDotPrefix.startsWith(basePathWithoutLeadingSlash)) {
        return `/${trimmedWithoutDotPrefix}`;
    }

    const relativePath = trimmedUrl.replace(/^\//, "").replace(/^\.\//, "");
    return new URL(relativePath, `${DUMMY_ORIGIN}${normalizedBasePath}`)
        .pathname;
}
