# Get Recharge JWT

A Node.js/Express API service that generates Recharge customer session tokens from Shopify session tokens. This service validates Shopify session tokens, extracts customer information, and creates authenticated sessions for the Recharge API.

## Features

- ✅ Validates Shopify session tokens using HMAC signature verification
- ✅ Extracts customer ID from Shopify session tokens
- ✅ Creates authenticated Recharge customer sessions
- ✅ Secure token verification with timing-safe comparison
- ✅ Error handling and validation

## Prerequisites

- Node.js (v18 or higher recommended)
- pnpm (v9.10.0+)
- Shopify app with session token authentication
- Recharge account with API access

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd get-recharge-jwt
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your credentials:
   - `SHOPIFY_APP_SECRET`: Your Shopify app's shared secret
   - `RECHARGE_ADMIN_TOKEN`: Your Recharge admin API token (requires `write_session` and `read_customer` scopes)
   - `RECHARGE_STOREFRONT_TOKEN`: Your Recharge storefront access token (select your required scopes)
   - `PORT`: Server port (default: 3000)

### Setting up Recharge API Tokens

In the **Recharge Merchant Portal**, go to: **Tools & Apps → API Tokens**

Create **two** Recharge tokens:

| Token Type | Required Scopes | Used For |
| :---- | :---- | :---- |
| Storefront Token | *(select your scopes)* | Create Customer Session in Recharge |
| Admin Token | `write_session`, `read_customer` | Look up customer by Shopify ID |

## Usage

### Start the server:
```bash
pnpm start
```

### Development mode (with auto-reload):
```bash
pnpm dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Testing with Shopify Front-End Extensions

To test this backend from a Shopify front-end extension, you'll need to expose your local server to the internet using ngrok.

### Setup ngrok

1. **Install ngrok** (if not already installed):
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start your local server**:
   ```bash
   pnpm start
   # or
   pnpm dev
   ```

3. **Expose your local server with ngrok**:
   ```bash
   ngrok http 3000
   ```
   
   This will output a public URL like `https://abc123.ngrok.io`

4. **Use the ngrok URL in your Shopify extension**:
   
   In your Shopify front-end extension code, make requests to the ngrok URL:
   ```javascript
   const response = await fetch('https://abc123.ngrok.io/generate_recharge_jwt', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       token: shopifySessionToken
     })
   });
   ```

### Important Notes

- **Free ngrok URLs change on restart**: Each time you restart ngrok, you'll get a new URL. Consider using a paid ngrok plan for a static domain.
- **HTTPS**: ngrok provides HTTPS URLs, which is required for Shopify extensions.
- **CORS**: The server already has CORS enabled, so requests from your Shopify extension should work.
- **Development only**: Only use ngrok for development/testing. For production, deploy to a proper hosting service.

## API Endpoints

### POST `/generate_recharge_jwt`

Generates a Recharge customer session token from a Shopify session token.

**Request Body:**
```json
{
  "token": "your_shopify_session_token_here"
}
```

**Success Response (200):**
```json
{
  "customerSession": {
    "api_token": "recharge_customer_session_token",
    "customer_id": 12345
  }
}
```

**Error Responses:**

- `400` - Invalid request (missing token or invalid format)
- `401` - Invalid session token signature
- `404` - Customer not found in Recharge
- `500` - Internal server error

## How It Works

1. **Token Validation**: The service verifies the Shopify session token signature using HMAC-SHA256 with your app's shared secret.

2. **Customer Extraction**: Extracts the Shopify customer ID from the token's `sub` field (format: `gid://shopify/Customer/{id}`).

3. **Recharge Lookup**: Queries Recharge API to find the customer by their Shopify customer ID (`external_customer_id`).

4. **Session Creation**: Creates a new Recharge customer session and returns the session token.

## Security

- Session tokens are verified using timing-safe comparison to prevent timing attacks
- All API requests use HTTPS
- Environment variables are used for sensitive credentials
- Token signatures are validated before processing

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port number | No (default: 3000) |
| `SHOPIFY_APP_SECRET` | Shopify app shared secret | Yes |
| `RECHARGE_ADMIN_TOKEN` | Recharge admin API token (requires `write_session` and `read_customer` scopes) | Yes |
| `RECHARGE_STOREFRONT_TOKEN` | Recharge storefront access token (select your required scopes) | Yes |

## Project Structure

```
get-recharge-jwt/
├── index.ts              # Express app setup and server configuration
├── routes/
│   └── auth.ts           # Authentication route handler
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **crypto**: Node.js built-in crypto module for token verification

## Notes

- This is a proof-of-concept (POC) project
- Ensure your Recharge API tokens have the necessary permissions

# Deployment to GCP
You can deploy the application to GCP using a command similar to:
```
 gcloud run deploy get-recharge-jwt \
  --source ./server \
  --region us-east1 \
  --allow-unauthenticated \
  --project=YOUR_PROJECT_NAME
```

And you can list your project names using `gcloud projects list`
