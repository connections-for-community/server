import { chromium } from "playwright";

// Mode profiles
const MODE_PROFILES = {
  venue_homepage: {
    keywords: [
      "book", "reserve", "ticket", "tickets", "buy",
      "events", "event", "venue hire", "rentals",
      "facility", "hall", "wedding", "performance"
    ]
  },
  hotel_homepage: {
    keywords: [
      "book", "reserve", "room", "rooms",
      "availability", "suite", "accommodation"
    ]
  },
  contact_only_homepage: {
    keywords: [
      "contact", "inquiry", "enquiry", "request",
      "booking", "venue booking", "facility booking",
      "rent", "rental", "apply"
    ]
  },
  default: {
    keywords: ["book", "reserve", "event", "ticket", "availability"]
  }
};

// Extractor helpers
async function extractLinks(page, keywords) {
  const raw = await page.$$eval("a", (as) =>
    as.map((a) => ({ text: a.innerText.trim(), href: a.href }))
  );
  return raw.filter((l) =>
    keywords.some((k) => l.text.toLowerCase().includes(k) || l.href.toLowerCase().includes(k))
  );
}

async function extractButtons(page, keywords) {
  const raw = await page.$$eval("button", (bs) =>
    bs.map((b) => ({ text: b.innerText.trim() }))
  );
  return raw.filter((b) =>
    keywords.some((k) => b.text.toLowerCase().includes(k))
  );
}

async function extractForms(page) {
  return page.$$eval("form", (forms) =>
    forms.slice(0, 20).map((f) => {
      const fields = Array.from(f.querySelectorAll("input, textarea, select"))
        .map((el) => el.name)
        .filter(Boolean);
      return {
        action: f.action || "",
        method: f.method || "",
        fields: fields.slice(0, 50)
      };
    })
  );
}

async function extractText(page, keywords) {
  return page.evaluate((keywords) => {
    return document.body.innerText
      .split("\n")
      .filter((line) =>
        keywords.some((k) => line.toLowerCase().includes(k))
      )
      .slice(0, 80)
      .join("\n");
  }, keywords);
}

async function extractHTMLSnippet(page) {
  return page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll("script, style, meta, noscript").forEach((el) => el.remove());
    return clone.innerHTML.slice(0, 60000);
  });
}

// Main homepage extractor
export async function extractHomepage(url, mode = "default") {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const page = await context.newPage();

  await page.route("**/*", (route) => {
    const type = route.request().resourceType();
    // if (["image", "media", "font", "stylesheet", "manifest"].includes(type)) {
    if (["image", "media", "manifest"].includes(type)) {
      return route.abort();
    }
    route.continue();
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const profile = MODE_PROFILES[mode] || MODE_PROFILES.default;
    const keywords = profile.keywords.map((k) => k.toLowerCase());

    const [links, buttons, forms, text, htmlSnippet] = await Promise.all([
      extractLinks(page, keywords),
      extractButtons(page, keywords),
      extractForms(page),
      extractText(page, keywords),
      extractHTMLSnippet(page),
    ]);

    const title = await page.title();
    const finalUrl = page.url();

    await browser.close();

    return {
      success: true,
      mode,
      targetUrl: url,
      finalUrl,
      title,
      extractedAt: new Date().toISOString(),
      links: links.slice(0, 50),
      buttons: buttons.slice(0, 30),
      forms: forms.slice(0, 30),
      text,
      htmlSnippet
    };
  } catch (err) {
    await browser.close();
    return {
      success: false,
      targetUrl: url,
      mode,
      error: err.toString()
    };
  }
}