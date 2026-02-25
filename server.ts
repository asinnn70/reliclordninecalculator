import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";

// Market Prices State for local dev
let marketPrices = {
  T1: { pieces: 1000, price: 0, lastUpdated: 0 },
  T2: { pieces: 5000, price: 0, lastUpdated: 0 },
  T3: { pieces: 10000, price: 0, lastUpdated: 0 },
  T4: { pieces: 50000, price: 0, lastUpdated: 0 },
  T5: { pieces: 100000, price: 0, lastUpdated: 0 },
};

let isFetching = false;

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  const activeUsers = new Map();

  // API Route for Visitors (Used by local dev)
  app.get("/api/visitors", async (req, res) => {
    const now = Date.now();
    const { id, action } = req.query;

    let totalVisitors = 0;

    try {
      if (action === 'visit') {
        const response = await fetch('https://api.counterapi.dev/v1/relic-lordnine/visitors/up');
        const data = await response.json();
        totalVisitors = data.count;
      } else {
        const response = await fetch('https://api.counterapi.dev/v1/relic-lordnine/visitors');
        const data = await response.json();
        totalVisitors = data.count || 0;
      }
    } catch (error) {
      console.error("Error fetching total visitors:", error);
    }

    if (id) {
      activeUsers.set(id, now);
    }

    // Clean up users inactive for > 1 minute
    for (const [key, lastSeen] of activeUsers.entries()) {
      if (now - lastSeen > 60000) {
        activeUsers.delete(key);
      }
    }

    return res.status(200).json({
      total: totalVisitors,
      online: Math.max(1, activeUsers.size)
    });
  });

  // API Route for Market Prices (Used by both local dev and Vercel)
  app.get("/api/market", async (req, res) => {
    const now = Date.now();
    
    // Cache for 60 seconds
    if (now - marketPrices.T1.lastUpdated < 60000) {
      return res.status(200).json({ type: "UPDATE", data: marketPrices });
    }

    if (isFetching) {
      // Return stale data while fetching
      return res.status(200).json({ type: "UPDATE", data: marketPrices });
    }

    isFetching = true;

    const ITEMS = [
      { tier: 'T1', name: "T1 Temporal Piece Chest x1,000" },
      { tier: 'T2', name: "T2 Temporal Piece Chest x5,000" },
      { tier: 'T3', name: "T3 Temporal Piece Chest x10,000" },
      { tier: 'T4', name: "T4 Temporal Piece Chest x50,000" },
      { tier: 'T5', name: "T5 Temporal Piece Chest x100,000" }
    ];

    try {
      for (const item of ITEMS) {
        const response = await fetch('https://api.nextmarket.games/l9asia/v1/sale/c2c?page=0', {
          method: 'POST',
          headers: {
            'authority': 'api.nextmarket.games',
            'content-type': 'application/json',
            'origin': 'https://l9asia.nextmarket.games',
            'referer': 'https://l9asia.nextmarket.games/',
            'user-agent': 'Mozilla/5.0'
          },
          body: JSON.stringify({
            keyword: item.name,
            realmCode: "NEW_REALM",
            presetId: 36
          })
        });

        if (response.ok) {
          const data = await response.json();
          const itemsList = data.content?.filter((x: any) => x.item?.name === item.name) || [];
          
          if (itemsList.length > 0) {
            const cheapest = itemsList.reduce((min: any, current: any) => {
              return current.cryptoPriceInfo.price < min.cryptoPriceInfo.price ? current : min;
            });
            marketPrices[item.tier as keyof typeof marketPrices].price = cheapest.cryptoPriceInfo.price;
          }
        }
        marketPrices[item.tier as keyof typeof marketPrices].lastUpdated = Date.now();
        
        // Sleep slightly to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    } finally {
      isFetching = false;
    }

    return res.status(200).json({ type: "UPDATE", data: marketPrices });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
