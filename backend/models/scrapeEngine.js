import axios from "axios";
import * as cheerio from "cheerio";
const scrapeWebData = async (url) => {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 3000,
    });
    const $ = cheerio.load(data);
    // Remove script, style, and noscript tags
    $("script, style, noscript").remove();
    // Get only the visible text
    const text = $("body").text();
    return text.replace(/\s+/g, " ").trim();
  } catch (error) {
    // console.error("Error scraping web data:", error);
    return "";
  }
};

const scrapeUrlList = async (urlList) => {
  const results = [];
  for (const url of urlList) {
    results.push({
      url,
      content: await scrapeWebData(url),
    });
    console.log(`Scraped: ${url}`);
  }
  return results;
};

export { scrapeUrlList };
