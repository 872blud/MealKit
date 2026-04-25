module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), '@sentry/react-native'],
  extra: {
    revenuecatApiKey: process.env.REVENUECAT_API_KEY ?? '',
    superwallApiKey: process.env.SUPERWALL_API_KEY ?? '',
    usdaApiKey: process.env.USDA_API_KEY ?? '',
    posthogApiKey: process.env.POSTHOG_API_KEY ?? '',
    sentryDsn: process.env.SENTRY_DSN ?? '',
    BETA_MODE: process.env.BETA_MODE === 'true',
  },
});
