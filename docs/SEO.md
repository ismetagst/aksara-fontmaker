# SEO and site identity

The current public origin is **https://aksarafontmaker.netlify.app/**. The Netlify subdomain is the canonical address until a custom domain is configured.

## Included files

- `index.html`: descriptive title, meta description, canonical URL, robots directive, theme color, Open Graph and Twitter summary metadata, and JSON-LD for the website, web application, and Resenarasi creator.
- `assets/favicon.svg`: editable violet A monogram for modern browsers.
- `favicon.ico`: PNG-backed 32, 48, and 96 px entries for browser compatibility.
- `assets/favicon-48.png`: explicit square PNG favicon for search engines.
- `assets/apple-touch-icon.png`: 180 px iOS home-screen icon.
- `assets/icon-192.png` and `assets/icon-512.png`: application and sharing icons.
- `site.webmanifest`: application name, relative scope/start URL, colors, and icons. This does not add offline support or save projects.
- `robots.txt`: permits crawling and points to the sitemap.
- `sitemap.xml`: lists the public editor URL.

Icon and manifest paths are relative so they also work when serving the checkout locally. Public canonical and sharing URLs intentionally use the production Netlify origin.

## After deployment

1. Confirm the home page, `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, and `/assets/favicon-48.png` return successful responses on the public host.
2. Add and verify the Netlify URL-prefix property in Google Search Console using the account that owns the site. Add the verification meta tag only after Google supplies its actual token.
3. Submit `https://aksarafontmaker.netlify.app/sitemap.xml` and inspect the home-page URL to request indexing.
4. Check the rendered page and structured data using Google's inspection tools. No ratings, reviews, or paid offers are declared.

SEO metadata makes the page easier to identify and crawl; it does not guarantee indexing, ranking, or a particular search-result display. Google may take days or weeks to refresh a favicon.

## Moving to a custom domain

Update the origin consistently in `index.html` (canonical, Open Graph URL/image, Twitter image, and JSON-LD identifiers/URLs), `robots.txt`, and `sitemap.xml`. Configure Netlify to redirect the previous host to the new primary domain, then verify and submit the new property in Search Console. Keep asset URLs stable.

## Sources

- [Google: favicon requirements](https://developers.google.com/search/docs/appearance/favicon-in-search)
- [Google: title links](https://developers.google.com/search/docs/appearance/title-link)
- [Google: sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
