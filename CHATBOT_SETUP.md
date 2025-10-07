# Chatbot Setup

This document explains how to set up the chatbot feature for the boiler pages.

## Features

- **Partner-specific chatbot**: Each partner gets a customized chatbot experience
- **Dynamic context**: The chatbot knows about the partner's products, addons, and customer's quote progress
- **Modern UI**: Clean, mobile-first design using shadcn/ui components
- **Gemini AI integration**: Uses Google's Gemini API for intelligent responses

## Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
GOOGLE_AI_API_KEY=your_gemini_api_key_here
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" in the left sidebar
4. Create a new API key
5. Copy the key and add it to your environment variables

## How It Works

### 1. Partner Context
The chatbot automatically detects the current partner based on the domain/subdomain and loads:
- Partner information (company name, description, contact details)
- Partner-specific products from `PartnerProducts` table
- Partner-specific addons from `Addons` table

### 2. Service Category Detection
The chatbot automatically detects which service the user is viewing based on the URL path:
- `/boiler/` → Boiler services
- `/solar/` → Solar services  
- `/battery/` → Battery services
- `/heat-pump/` → Heat pump services
- `/insulation/` → Insulation services

This ensures the chatbot provides relevant, service-specific information and products.

### 3. Customer Context
If a customer is in the middle of a quote process (has a `submission` parameter in the URL), the chatbot can access:
- Current page they're on
- Pages they've completed
- Form answers they've provided
- Products they've selected
- Addons they've chosen

### 4. AI Integration
The chatbot uses Google's Gemini API to provide intelligent responses based on:
- The customer's question
- Partner's products and services
- Customer's current quote progress
- Partner's business information

## Usage

The chatbot appears as a floating button in the bottom-right corner of boiler pages. Customers can:
- Ask questions about products
- Get help with the quote process
- Learn about addons and services
- Get general support

## Customization

The chatbot automatically adapts to each partner's:
- Company colors (uses partner's `company_color`)
- Business information
- Product catalog
- Service offerings

## Database Tables Used

- `PartnerProducts`: Partner-specific products
- `Addons`: Partner-specific addons
- `lead_submission_data`: Customer's quote progress
- Partner profile data from the partner resolution system

## API Endpoint

The chatbot uses `/api/chatbot` endpoint which:
1. Receives the customer's message and context
2. Calls the Gemini API with partner and customer context
3. Returns an intelligent response

## Troubleshooting

### Test the Gemini API Connection

Visit `/api/chatbot/test` to test if your Gemini API key is working correctly. This will help diagnose connection issues.

### Common Issues

1. **"Failed to get response from AI" error**
   - Check if `GOOGLE_AI_API_KEY` is set in your environment variables
   - Verify the API key is valid by visiting `/api/chatbot/test`
   - Check the server logs for detailed error messages

2. **API key not configured error**
   - Add `GOOGLE_AI_API_KEY=your_key_here` to your `.env.local` file
   - Restart your development server after adding the environment variable

3. **Invalid response from AI**
   - The Gemini API might be experiencing issues
   - Check your API key permissions and quotas
   - The chatbot will show a fallback message if the API fails

### Environment Variable Setup

Create a `.env.local` file in your project root:

```bash
GOOGLE_AI_API_KEY=your_gemini_api_key_here
```

Make sure to restart your development server after adding the environment variable.

## Security

- API key is stored server-side only
- No sensitive customer data is sent to external APIs
- Partner data is filtered to only include relevant information
- Fallback responses are provided if the AI service is unavailable
