import dotenv from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, tool } from "langchain";
import * as z from "zod";
import puppeteer from "puppeteer";

import {
  openPage,
  clickElement,
  typeText,
  getIntractiveElements,
  getPageTextContent,
  getAllLinks,
  simulateEnterKey,
} from "../tools/browserTools.js"; // your helper file
import { getBrowser } from "../util/Browser.js";

dotenv.config();

const initializeAgent = async () => {
  const browser = await getBrowser();

  const simulateEnterKeyTool = tool(
    async ({ selector }) => {
      const pages = await browser.pages();
      const page = pages[pages.length - 1];
      await simulateEnterKey(page, selector);
      return `Simulated Enter key on element with selector: ${selector}`;
    },
    {
      name: "simulate_enter_key",
      description:
        "Simulates pressing the Enter key on an element using a CSS selector.",
      schema: z.object({
        selector: z.string(),
      }),
    }
  );

  const openWebPage = tool(
    async ({ url }) => {
      const page = await openPage(browser, url);
      const title = await page.title();
      return `Opened page: ${title}`;
    },
    {
      name: "open_web_page",
      description: "Opens a webpage and returns its title.",
      schema: z.object({
        url: z.string().url(),
      }),
    }
  );

  const getInteractiveElements = tool(
    async () => {
      const pages = await browser.pages();
      const page = pages[pages.length - 1];
      const elements = await getIntractiveElements(page);
      return elements.slice(0, 20).join("\n"); // limit to first 20
    },
    {
      name: "get_interactive_elements",
      description:
        "Gets a list of clickable and input elements on the current webpage (first 20).",
      schema: z.object({}),
    }
  );

  const clickElementTool = tool(
    async ({ selector }) => {
      const pages = await browser.pages();
      const page = pages[pages.length - 1];
      await clickElement(page, selector);
      return `Clicked element with selector: ${selector}`;
    },
    {
      name: "click_element",
      description: "Clicks an element on the page using a CSS selector.",
      schema: z.object({
        selector: z.string(),
      }),
    }
  );

  const typeTextTool = tool(
    async ({ selector, text }) => {
      const pages = await browser.pages();
      const page = pages[pages.length - 1];
      await typeText(page, selector, text);
      return `Typed '${text}' into ${selector}`;
    },
    {
      name: "type_text",
      description: "Types text into an input field using a CSS selector.",
      schema: z.object({
        selector: z.string(),
        text: z.string(),
      }),
    }
  );

  const readPageText = tool(
    async () => {
      const pages = await browser.pages();
      const page = pages[pages.length - 1];
      const text = await getPageTextContent(page);
      return text;
    },
    {
      name: "read_page_text",
      description:
        "Reads up to 2000 characters of visible text from the current webpage.",
      schema: z.object({}),
    }
  );

  const listAllLinks = tool(
    async () => {
      const pages = await browser.pages();
      const page = pages[pages.length - 1];
      const links = await getAllLinks(page);
      return links.slice(0, 20).join("\n"); // limit to first 20
    },
    {
      name: "list_all_links",
      description: "Lists all hyperlinks on the current webpage (first 20).",
      schema: z.object({}),
    }
  );

  const getWeather = tool(
    async ({ city }) => `The weather in ${city} is always sunny!`,
    {
      name: "get_weather",
      description: "Get weather for a given city.",
      schema: z.object({ city: z.string() }),
    }
  );

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.7,
  });

  const agent = createAgent({
    model: llm,
    recursionLimit: 50,
    systemPrompt: `You are a web automation agent that controls a Puppeteer browser strictly via the provided tools.

Identity and scope:
- Operate only through the supplied tools; never assume hidden capabilities, OS access, or visual perception. 
- Treat all pages as text-first; do not infer colors, layout, or images beyond what tools return.
 Do NOT repeatedly call the same tool unless new information is required
Hard constraints:
1) For discovery, always search via DuckDuckGo first and open result links from there using open_web_page. 
   - Prefer advanced operators like "site:", quoted phrases, and reasonable keywords to narrow scope. 
2) Never guess selectors. Only interact with CSS selectors explicitly returned by get_interactive_elements or surfaced in tool outputs. 
3) Before any decision or action on a new page, call read_page_text to understand context and confirm the page is ready. 
4) Confirm a page is open before interacting: 
   - After open_web_page, immediately call read_page_text; if text is empty or unrelated, call list_all_links or get_interactive_elements to verify context.  
or actions that change state other than benign navigation and clicks. 
Operational loop (concise, structured reasoning):
- Plan: State the immediate objective and which tool you will use next, grounded in prior tool outputs. 
- Act: Call exactly one tool per step. 
- Observe: Summarize key text/links/selectors returned. 
- Decide: Either continue with another tool or provide a final answer. 
- Keep thoughts concise; no repetition.

Search playbook (DuckDuckGo):
- If given a broad goal or a URL with unclear next steps, open DuckDuckGo, type a focused query (e.g., "site:example.com target phrase"), press Enter, read_page_text, then list_all_links to find the best result link to open. 
- Open only one candidate at a time; after opening, re-read page text and proceed. 

Click-and-wait discipline:
- After click_element or simulate_enter_key that likely triggers navigation, immediately call read_page_text to confirm new content before proceeding. 
- If content appears unchanged, call list_all_links or get_interactive_elements to verify you are on the intended page, or go back to results via search flow. 

Selector policy:
- Use selectors exactly as returned by get_interactive_elements; if multiple are similar, choose the most specific and stable-looking one. 
- If no suitable selector appears, re-run get_interactive_elements after scrolling via page semantics (e.g., opening more results) when available through provided tools; otherwise, revise the search path. 

Error handling and recovery:
- If a tool fails or returns empty content, re-validate page context with read_page_text, then adjust strategy (refine query, choose a different link, or retry with a different selector from the tool output). 
- If a required selector is not present, do not guess; instead, gather fresh interactive elements and pick from that list. 

Output expectations:
- Provide final answers as concise summaries grounded strictly in text gathered with read_page_text, including which pages were covered. 
- Do not include raw selectors in the final summary unless explicitly requested. 
- If instructions require visiting “all pages,” enumerate discovered internal links and summarize each one briefly. 

`,
    tools: [
      getWeather,
      openWebPage,
      clickElementTool,
      typeTextTool,
      readPageText,
      listAllLinks,
      getInteractiveElements,
      simulateEnterKeyTool,
    ],
  });

  return agent;
};

export default initializeAgent;

// for await (const chunk of await agent.stream(
//   {
//     messages: [
//       {
//         role: "user",
//         content: "https://www.nandhakrishnan.tech/ go to all pages and summarize about him",
//       },
//     ],
//   },
//   { streamMode: "values" }
// )) {
//   const [step, content] = Object.entries(chunk)[0];
//   console.log(`step: ${step}`);
//   console.log(`content: ${JSON.stringify(content, null, 2)}`);
// }

// console.log("Done with tasks. Closing browser.");
