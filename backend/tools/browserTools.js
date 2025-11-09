

const openPage = async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url);
    return page;
}


const clickElement = async (page, selector) => {
    await page.waitForSelector(selector);
    await page.click(selector);
}

const typeText = async (page, selector, text) => {
    await page.waitForSelector(selector);
    await page.type(selector, text);
}

const getIntractiveElements = async (page) => {
    
    const elements = await page.$$eval('a, button,input ,  input[type="button"], input[type="submit"]', els => els.map(el => el.outerHTML));
    return elements;
}


const getPageTextContent = async (page) => {
    const textContent = await page.evaluate(() => document.body.innerText);
    return textContent.slice(0, 2000)
}

const getAllLinks = async (page) => {
    const links = await page.$$eval('a', els => els.map(el => el.href));
    return links;
}

const simulateEnterKey = async (page, selector) => {
    await page.waitForSelector(selector);
    await page.focus(selector);
    await page.keyboard.press('Enter');
}


export { clickElement, simulateEnterKey, typeText , openPage , getIntractiveElements , getPageTextContent , getAllLinks};