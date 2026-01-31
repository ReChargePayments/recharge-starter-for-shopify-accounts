import { useMemo } from 'preact/hooks';
import { productSearch } from '@rechargeapps/storefront-client';
import { useRechargeQuery } from './useRechargeQuery';

type ProductImageMap = Record<string, string>;

type ProductSearchResponse = {
  products: Array<{
    external_product_id: string;
    images?: Array<{ medium: string; large: string; small: string; original: string }>;
    variants: Array<{
      external_variant_id: string;
      image?: { medium: string; large: string; small: string; original: string };
    }>;
  }>;
};

/**
 * Fetch product images for given variant IDs
 */
export function useProductImages(variantIds: (string | number | null | undefined)[]): ProductImageMap {
  // Filter and normalize variant IDs
  const normalizedIds = useMemo(() => 
    variantIds
      .filter((id): id is string | number => id != null)
      .map(id => String(id)),
    [variantIds.join(',')]
  );

  const searchParams = useMemo(() => 
    normalizedIds.length > 0 ? {
      external_variant_ids: normalizedIds,
      format_version: '2022-06' as const,
      product_published_status: 'any' as const,
    } : undefined,
    [normalizedIds.join(',')]
  );

  const { data: imageMapData } = useRechargeQuery(
    async (session, params) => {
      return await productSearch(session, params!) as ProductSearchResponse;
    },
    searchParams,
    {
      enabled: normalizedIds.length > 0,
      select: (response) => {
        const newImageMap: ProductImageMap = {};

        // Build map from variant ID to image URL
        for (const product of response.products) {
          for (const variant of product.variants) {
            const variantId = String(variant.external_variant_id);
            const imageUrl = variant.image?.medium
              || variant.image?.large
              || (product.images?.[0]?.medium)
              || (product.images?.[0]?.large);

            if (imageUrl) {
              newImageMap[variantId] = imageUrl;
            }
          }
        }

        return newImageMap;
      },
      deps: [normalizedIds.join(',')],
    }
  );

  // Ensure imageMap is always an object
  return imageMapData ?? {};
}
