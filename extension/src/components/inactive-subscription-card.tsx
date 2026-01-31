import { useState } from "preact/hooks";
import { ProductData } from "./types";

type Props = {
  product: ProductData;
  onSubscribe: (product: ProductData) => void | Promise<void>;
};

export const InactiveSubscriptionCard = ({ product, onSubscribe }: Props) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { imageSrc, title, subTitle, price } = product;

  const handleSubscribe = async () => {
    if (isUpdating) return;
    try {
      setIsUpdating(true);
      await onSubscribe(product);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <s-stack direction="inline" justifyContent="space-between" alignItems="center">
      <s-stack direction="inline" alignItems="center" gap="base">
        <s-box padding="none base">
          <s-product-thumbnail src={imageSrc ?? undefined} />
        </s-box>
        <s-stack>
          <s-text>{title}</s-text>
          {subTitle ? (
            <s-text type="small" color="subdued">
              {subTitle}
            </s-text>
          ) : null}
          <s-text type="strong">{price}</s-text>
        </s-stack>
      </s-stack>

      {isUpdating ? (
        <s-stack direction="inline" alignItems="center" gap="small">
          <s-spinner accessibilityLabel="Subscribing" />
          <s-text>Subscribing...</s-text>
        </s-stack>
      ) : (
        <s-button variant="primary" onClick={handleSubscribe}>
          Subscribe
        </s-button>
      )}
    </s-stack>
  );
};


