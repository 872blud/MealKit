module.exports = ({ config }) => ({
  ...config,
  extra: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    revenuecatApiKey: process.env.REVENUECAT_API_KEY ?? '',
    usdaApiKey: process.env.USDA_API_KEY ?? '',
    posthogApiKey: process.env.POSTHOG_API_KEY ?? '',
  },
});
