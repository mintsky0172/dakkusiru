import { ShopPack } from "../types/shop";

function normalizeSearchText(value?: string | null) {
    return (value ?? '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .trim();
}

export function searchPacks(packs: ShopPack[], query: string) {
    const normalizedQuery = normalizeSearchText(query);

    if(!normalizedQuery) return packs;

    return packs.filter((pack) => {
        const searchableText = normalizeSearchText(
            [
                pack.id,
                pack.title,
                pack.kind,
                pack.category,
                pack.status,
                pack.description,
                pack.coinPrice ? `${pack.coinPrice}코인` : '',
            ].join(' ')
        );

        return searchableText.includes(normalizedQuery)
    })
}