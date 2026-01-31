import express, { Request, Response } from "express";
import "dotenv/config";
import crypto from "crypto";
const router = express.Router();

/**
 * Verifies a Shopify session token signature according to Shopify's documentation.
 * Session tokens are signed using HS256 algorithm with the app's shared secret.
 * 
 * @param token - The JWT session token (format: header.payload.signature)
 * @param sharedSecret - The app's shared secret from Shopify
 * @returns true if the signature is valid, false otherwise
 */
function verifyShopifySessionToken(token: string, sharedSecret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [header, payload, receivedSignature] = parts;

  // Step 1: Take the <header>.<payload> portion
  const headerPayload = `${header}.${payload}`;

  // Step 2 & 3: Sign using HS256 with the shared secret and base64url-encode
  const hmac = crypto.createHmac('sha256', sharedSecret);
  hmac.update(headerPayload);
  const calculatedSignature = hmac.digest('base64url');

  // Step 4: Verify that the result matches the signature in the token
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(receivedSignature)
  );
}

/**
 * Decodes the JWT payload and extracts the customer ID from the 'sub' field.
 * The 'sub' field is in the format: gid://shopify/Customer/{id}
 * 
 * @param token - The JWT session token
 * @returns The customer ID as a string, or null if not found/invalid
 */
function extractCustomerIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];

    // Decode base64url-encoded payload
    const decodedPayload = Buffer.from(payload, 'base64url').toString('utf-8');
    const payloadObj = JSON.parse(decodedPayload);

    // Extract customer ID from sub field (format: gid://shopify/Customer/{id})
    const sub = payloadObj.sub;
    if (!sub || typeof sub !== 'string') {
      return null;
    }

    // Parse the GID format: gid://shopify/Customer/{id}
    const match = sub.match(/^gid:\/\/shopify\/Customer\/(\d+)$/);
    if (!match) {
      return null;
    }

    return match[1];
  } catch (error) {
    console.error('Error extracting customer ID from token:', error);
    return null;
  }
}

export default router.post('/', async function (req: Request, res: Response) {
  try {
    const sessionToken = req?.body?.token;

    // Session token is required to extract customer ID
    if (!sessionToken) {
      return res.status(401).json({
        error: "Session token is required"
      });
    }

    // Verify the session token
    const sharedSecret = process.env.SHOPIFY_APP_SECRET;
    if (!sharedSecret) {
      return res.status(500).json({
        error: "SHOPIFY_APP_SECRET environment variable is not configured"
      });
    }

    // Validate Recharge tokens are configured
    const rechargeAdminToken = process.env.RECHARGE_ADMIN_TOKEN;
    const rechargeStorefrontToken = process.env.RECHARGE_STOREFRONT_TOKEN;
    
    if (!rechargeAdminToken || !rechargeStorefrontToken) {
      return res.status(500).json({
        error: "Recharge API tokens are not configured",
        message: "RECHARGE_ADMIN_TOKEN and RECHARGE_STOREFRONT_TOKEN must be set"
      });
    }

    const isValid = verifyShopifySessionToken(sessionToken, sharedSecret);
    if (!isValid) {
      return res.status(401).json({
        error: "Invalid session token signature"
      });
    }

    // Extract customer ID from token payload
    const shopifyCustomerId = extractCustomerIdFromToken(sessionToken);
    if (!shopifyCustomerId) {
      return res.status(400).json({
        error: "Could not extract customer ID from session token"
      });
    }

    console.log("Mapped Shopify Customer ID:", shopifyCustomerId);

    const customerResponse = await fetch(
      `https://api.rechargeapps.com/customers?external_customer_id=${shopifyCustomerId}`,
      {
        headers: {
          "X-Recharge-Version": "2021-11",
          "X-Recharge-Access-Token": String(rechargeAdminToken),
        },
      }
    );

    if (!customerResponse.ok) {
      const errorData: any = await customerResponse.json().catch(() => ({}));
      return res.status(customerResponse.status).json({
        error: "Failed to lookup customer in Recharge",
        message: errorData.error || `Recharge API returned ${customerResponse.status}`
      });
    }

    const customerData: any = await customerResponse.json();
    const customer = customerData?.customers?.[0];

    if (!customer) {
      return res.status(404).json({
        error:
          "Customer not found in Recharge — no subscriptions for this account yet.",
      });
    }

    const sessionResponse = await fetch(
      `https://api.rechargeapps.com/customers/${customer.id}/sessions`,
      {
        method: "POST",
        headers: {
          "X-Recharge-Version": "2021-11",
          "Content-Type": "application/json",
          "X-Recharge-Access-Token": String(rechargeAdminToken),
          "x-recharge-storefront-access-token": String(rechargeStorefrontToken),
        },
        body: JSON.stringify({}),
      }
    );

    if (!sessionResponse.ok) {
      const errorData: any = await sessionResponse.json().catch(() => ({}));
      return res.status(sessionResponse.status).json({
        error: "Failed to create Recharge session",
        message: errorData.error || `Recharge API returned ${sessionResponse.status}`
      });
    }

    const result: any = await sessionResponse.json();
    const customerSession = result?.customer_session;

    if (!customerSession) {
      return res.status(500).json({
        error: "Failed to create Recharge session",
        message: "Session response did not contain customer_session"
      });
    }

    // Example: { api_token: "...", customer_id: 12345 }
    return res.json({ customerSession });
  }
  catch (e) {
    console.error('Error generating Recharge JWT:', e);
    return res.status(500).json({
      error: "Internal server error",
      message: e instanceof Error ? e.message : "Unknown error occurred"
    });
  }
})

