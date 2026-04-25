# mealkit

mealkit is an iphone app for turning whatever groceries you already have into recipes you can actually make.

the idea is simple: scan a receipt, barcode, or photo of your ingredients, let the app clean up the list, then get recipe ideas with nutrition attached. i wanted this to feel less like a huge recipe search engine and more like opening the fridge and having the app say, "yeah, make this."

## what it does

- scans groceries from receipts, barcodes, or counter photos
- builds a clean ingredient list without making you type everything by hand
- generates recipes from what you already have
- shows calories and macros so the recipe fits into the rest of your day
- keeps basic nutrition goals and daily progress in the app
- has shareable recipe cards for stuff that turns out good

## why i made it

most recipe apps still make you do too much work. you search, scroll, compare, realize you are missing half the ingredients, then give up and order food.

mealkit is supposed to start from the other direction. it looks at what you bought first, then figures out what makes sense from there.

## stack

- react native
- expo
- expo router
- typescript
- zustand
- asyncstorage
- local recipe and ingredient workflows
- camera, barcode scanning, haptics, healthkit, revenuecat, superwall, sentry, and posthog integrations

## running it locally

install dependencies:

```bash
npm install
```

start expo:

```bash
npm run start
```

run on ios:

```bash
npm run ios
```

you will need local keys for the paid services. keep those in your own `.env` file. the real `.env` is intentionally ignored so secrets do not end up in the repo.

## status

this is still an active build. the main app flow is there, but parts of the api setup, subscription flow, and testflight polish are still being worked through.
