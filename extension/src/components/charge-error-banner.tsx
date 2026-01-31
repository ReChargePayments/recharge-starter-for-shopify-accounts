import { useChargeError } from '../hooks/useChargeError';
import { formatDateDisplay } from '../utils/date';

export default function ChargeErrorBanner() {
  const { data, isInitialLoading } = useChargeError();

  if (isInitialLoading || !data) {
    return null;
  }

  const formattedDate = formatDateDisplay(data.scheduledAt, 'short');
  const heading = formattedDate
    ? `Action required: there's a problem with your ${formattedDate} order`
    : "Action required: there's a problem with your order";

  // Navigate to order detail page - adjust the route as needed
  const handleViewOrder = () => {
    // You may need to adjust this route based on your routing setup
    // For now, using a placeholder that you can update
    //shopify.navigate(`/subscriptions/charge/${data.id}`);
  };

  return (
    <s-banner heading={heading} tone="critical">
      <s-stack direction='inline' justifyContent='space-between'>
        <s-stack>
          <s-paragraph>
            Click the button to view the first affected order and fix the problem.
            Affected orders won't be dispatched until the problem is resolved.
          </s-paragraph>
        </s-stack>
        <s-stack>
          <s-button
            slot="secondary-actions"
            variant="primary"
            onClick={handleViewOrder}
          >
            View order
          </s-button>
        </s-stack>
      </s-stack>
    </s-banner>
  );
}
