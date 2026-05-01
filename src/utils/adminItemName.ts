export function getBaseNameFromFileName(fileName?: string | null) {
    if(!fileName) return '';

    return fileName
        .replace(/\.[^/.]+$/, '')
        .trim()
}

export function normalizeItemId(value: string, fallback: string) {
    const normalized = value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_/g, '-')
        .replace(/[^a-z0-9가-힣-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return normalized || fallback;
}

export function getDisplayNameFromItemId(itemId: string) {
    return itemId.replace(/-/g, ' ')
}