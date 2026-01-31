export type SwapVariantOption = {
  variantExternalId: string;
  productExternalId: string;
  brand?: string | null;
  title: string;
  description?: string | null;
  imageSrc?: string | null;
};

type Props = {
  option: SwapVariantOption;
  selected?: boolean;
  onSelect: (option: SwapVariantOption) => void;
};

export const SwapOptionCard = ({ option, selected, onSelect }: Props) => {
  const { imageSrc, brand, title, description } = option;

  return (
    <s-clickable
      onClick={() => onSelect(option)}
      padding="base"
      border="base"
      borderRadius="base"
      background={selected ? "subdued" : "base"}
    >
      <s-stack direction="inline" alignItems="center" gap="base">
        <s-box padding="none">
          <s-product-thumbnail src={imageSrc ?? undefined} />
        </s-box>
        <s-stack>
          {brand ? (
            <s-text type="small" color="subdued">
              {brand}
            </s-text>
          ) : null}
          <s-text>{title}</s-text>
          {description ? (
            <s-text type="small" color="subdued">
              {description}
            </s-text>
          ) : null}
        </s-stack>
      </s-stack>
    </s-clickable>
  );
};


