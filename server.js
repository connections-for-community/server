import express from "express";
// import cors from "cors";
import { extractHomepage } from "./playwright/homepage.js";
import { crawlBookingPage } from "./playwright/booking.js";

const app = express();
// app.use(cors());
app.use(express.json());

// POST /scrape
app.post("/scrape", async (req, res) => {
  const { url, mode } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Missing 'url' in POST body"
    });
  }

  try {
    const result = await extractHomepage(url, mode || "default");
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.toString()
    });
  }
});

app.post("/crawl-page", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Missing 'url' in POST body"
    });
  }

  try {
    const result = await crawlBookingPage(url);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.toString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Playwright scraper running on port ${PORT}`)
);