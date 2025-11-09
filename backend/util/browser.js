import puppeteer from "puppeteer";

let browser = null;

export async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false,
      args: ["--start-maximized"],
    });
    console.log("🚀 Puppeteer browser started");
  }
  return browser;
}
