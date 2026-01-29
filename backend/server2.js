import express from "express";
import agentRoutes from "./routes/agentRoutes.js";

const app = express();
const PORT = 3001;
import cors from "cors";
import { getBrowser } from "./util/Browser.js";

app.use(cors());
app.use(express.json()); // Add JSON middleware for agent routes
let activePage = null;

export async function initializePage() {
  const browser = await getBrowser();
  const pages = await browser.pages();
  activePage = pages[0] || (await browser.newPage());
  return activePage;
}

export async function setActivePage(page) {
  activePage = page;
}

// Get current active page
export async function getActivePage() {
  if (!activePage) {
    activePage = await initializePage();
  }
  return activePage;
}

app.get("/screenshot", async (req, res) => {
  try {
    const page = await getActivePage();
    const screenshot = await page.screenshot({
      encoding: "base64",
      type: "jpeg",
      quality: parseInt(req.query.quality) || 80,
    });

    res.json({
      success: true,
      screenshot: `data:image/jpeg;base64,${screenshot}`,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Screenshot error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/stream", async (req, res) => {
  const searchQuery = req.query.q;
  if (!searchQuery) {
    res.status(400).send("Missing 'q' query parameter");
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // const response = await callAgent(searchQuery, res);
  res.end();

  req.on("close", () => {
    console.log("Client disconnected. Stopping stream.");
    res.end();
  });
});

// Use agent routes
app.use("/api/agent", agentRoutes);

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, () => {
  console.log(`Server listening on port http://localhost:${PORT}`);
});
