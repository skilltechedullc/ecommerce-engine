# AI Chat Widget Setup

## Required Environment Variable

Add this variable in Vercel Project Settings for all relevant environments:

- `ANTHROPIC_API_KEY`

## Get Your Anthropic API Key

1. Go to https://console.anthropic.com.
2. Sign in and open API Keys.
3. Create a new key.
4. Copy it and add it as `ANTHROPIC_API_KEY` in Vercel.

## Model Used

The widget uses `claude-haiku-4-5-20251001`.

Why this model:
- Fast response time for chat UX.
- Lower cost compared with larger models.
- Strong enough quality for catalog guidance, policy questions, and ordering help.

## Estimated Cost

Typical short ecommerce conversations are very low cost with Haiku.
In most cases, cost per conversation is only a small fraction of a cent to a few cents depending on message length and catalog size.

## Feature Flag Control

AI chat display is controlled by tenant feature flag:

- `tenantConfig.features.aiChat`
- Env source: `NEXT_PUBLIC_FEATURE_AI_CHAT`
- Default in code is enabled for development convenience.

To disable widget rendering, set:

- `NEXT_PUBLIC_FEATURE_AI_CHAT=false`

## Local Testing Reminder

Before local testing, add this to `.env.local`:

- `ANTHROPIC_API_KEY=your_key_here`
