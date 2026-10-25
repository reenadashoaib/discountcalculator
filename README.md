# Discount Calculator

A static discount calculator website with ad spaces, ready for Cloudflare and Google AdSense. No build step: the site is plain HTML, CSS and JavaScript in `public/`.

## Run it locally

```bash
cd public
python3 -m http.server 8000
```

Open http://localhost:8000.

## Deploy to Cloudflare

The site is deployed as a Cloudflare Worker that serves the `public/` folder (see `wrangler.jsonc`). Live at:

https://discountcalculator.reenadashoaib.workers.dev

To deploy a change:

```bash
npx wrangler@4 login     # once, or set CLOUDFLARE_API_TOKEN
npx wrangler@4 deploy
```

`public/_headers` sets security and cache headers. `public/404.html` is shown for missing pages. `public/.assetsignore` lists files that are not uploaded.

To use your own domain, add it to Cloudflare, then in **Workers & Pages → discountcalculator → Settings → Domains & Routes** add it as a custom domain.

## Before you apply for AdSense

Replace these placeholders:

| Placeholder | Where | Replace with |
| --- | --- | --- |
| `ca-pub-XXXXXXXXXXXXXXXX` | `<meta name="google-adsense-account">` in every `.html` file | Your AdSense publisher ID |
| `pub-XXXXXXXXXXXXXXXX` | `public/ads.txt` | The exact line AdSense gives you under **Sites → ads.txt** |
| `YOUR-DOMAIN.com` | `robots.txt`, `sitemap.xml`, `contact.html`, `privacy.html` | Your domain and email |

Then in AdSense:

- Add your site. The meta tag is how AdSense verifies you own it.
- Under **Privacy & messaging**, turn on the consent message for the EEA, UK and Switzerland. The privacy policy says visitors there are asked for consent, so this has to be on.
- Optional: turn on **Auto ads → Vignette ads** to get AdSense full-screen ads between page views (see the popup note below).

## Ad spaces

| Slot name | Size | Where |
| --- | --- | --- |
| `top-banner` | 728×90 (320×100 on phones) | Under the header, every page with ads |
| `rail-left`, `rail-right` | 160×600 (300×600 on very wide screens) | Sticky side columns, screens 1300px and wider |
| `tile-1` to `tile-6` | 300×250 | Two rows of three tiles on the home page |
| `in-content` | 336×280 | Between the how-to and stacked-discount sections |
| `bottom-banner` | 728×90 (320×100 on phones) | Above the footer |
| Video | 16:9, 340px wide | Floating bottom right, closable |
| Popup | Full screen | Once per visitor per 24 hours, after 20 seconds |

All ads are configured in **`public/js/ads.js`** in `AD_CONFIG`. For each slot:

```js
"top-banner": { adsense: "1234567890" },                         // AdSense ad unit ID
"tile-1": { image: "ads/acme.jpg", href: "https://acme.com" },   // an ad you sold directly
"tile-2": {},                                                    // unsold
```

Put direct-sold images and videos in `public/ads/`. Set `showPlaceholders: false` to hide unsold slots instead of showing an "Ad space" box.

### AdSense rules for the video and popup

- **Popup:** AdSense doesn't allow its ads inside pop-ups, so the popup only shows ads you sell directly. For AdSense full-screen ads use Vignette ads (above).
- **Video:** AdSense doesn't serve video into a custom floating box, so the video slot is also for direct-sold video only.

Both can be turned off with `enabled: false`.

AdSense also limits ads near buttons and on pages with little content. The contact, privacy, terms and 404 pages have no ads for that reason.
