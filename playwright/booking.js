import { chromium } from "playwright";

// ----------------------------
// Extract forms
// ----------------------------
async function extractForms(page) {
  return page.$$eval("form", (forms) =>
    forms.slice(0, 20).map((f) => {
      const fields = Array.from(
        f.querySelectorAll("input, textarea, select")
      )
        .map((el) => el.name || el.id || "")
        .filter(Boolean);

      return {
        action: f.action || "",
        method: f.method || "",
        fields: fields.slice(0, 50),
      };
    })
  );
}

// ----------------------------
// Detect major third-party booking platforms
// ----------------------------
async function detectThirdParty(page) {
  const html = await page.content();

  if (/opentable/i.test(html)) return "OpenTable";
  if (/resy/i.test(html)) return "Resy";
  if (/tock/i.test(html)) return "Tock";
  if (/eventbrite/i.test(html)) return "Eventbrite";
  if (/ticketmaster/i.test(html)) return "Ticketmaster";
  if (/univers/i.test(html)) return "Universe";
  if (/showpass/i.test(html)) return "Showpass";
  if (/fareharbor/i.test(html)) return "FareHarbor";

  return "None";
}

// ----------------------------
// Detect datepickers
// ----------------------------
async function detectDatePicker(page) {
  return page.evaluate(() => {
    const selectors = [
      "input[type=date]",
      ".datepicker",
      "[data-calendar]",
      "[data-datepicker]",
      "[class*=calendar]"
    ];
    return selectors.some((sel) => document.querySelector(sel));
  });
}

// ----------------------------
// Main booking crawler
// ----------------------------
export async function crawlBookingPage(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Light resource blocking — DO NOT block scripts/CSS
  await page.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (["image", "media", "manifest"].includes(type)) {
      return route.abort();
    }
    route.continue();
  });

  try {
    // Navigation settings
    await page.setDefaultNavigationTimeout(15000);
    await page.setDefaultTimeout(15000);

    // Perform navigation
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const status = response ? response.status() : 0;
    const finalUrl = page.url();
    const title = await page.title();

    // Explicitly detect HTTP errors
    if (!response || status >= 400) {
      await browser.close();
      return {
        success: false,
        targetUrl: url,
        finalUrl,
        httpStatus: status,
        title,
        error: status >= 400 ? "HTTP error on booking page" :
               "Navigation produced no response",
      };
    }

    // Extract booking-relevant features
    const [forms, thirdParty, hasDatePicker] = await Promise.all([
      extractForms(page),
      detectThirdParty(page),
      detectDatePicker(page),
    ]);

    await browser.close();

    return {
      success: true,
      targetUrl: url,
      finalUrl,
      title,
      httpStatus: status,
      forms,
      hasDatePicker,
      thirdParty,
    };

  } catch (err) {
    await browser.close();
    return {
      success: false,
      targetUrl: url,
      error: err.toString(),
    };
  }
}