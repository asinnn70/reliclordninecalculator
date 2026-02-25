import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Market Prices State
  let marketPrices = {
    T1: { pieces: 1000, price: 0, lastUpdated: Date.now() },
    T2: { pieces: 5000, price: 0, lastUpdated: Date.now() },
    T3: { pieces: 10000, price: 0, lastUpdated: Date.now() },
    T4: { pieces: 50000, price: 0, lastUpdated: Date.now() },
    T5: { pieces: 100000, price: 0, lastUpdated: Date.now() },
  };

  const broadcastPrices = () => {
    const broadcastData = JSON.stringify({ type: "UPDATE", data: marketPrices });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(broadcastData);
      }
    });
  };

  const fetchAllPrices = async () => {
    const ITEMS = [
      { tier: 'T1', name: "T1 Temporal Piece Chest x1,000" },
      { tier: 'T2', name: "T2 Temporal Piece Chest x5,000" },
      { tier: 'T3', name: "T3 Temporal Piece Chest x10,000" },
      { tier: 'T4', name: "T4 Temporal Piece Chest x50,000" },
      { tier: 'T5', name: "T5 Temporal Piece Chest x100,000" }
    ];

    let updated = false;

    for (const item of ITEMS) {
      try {
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
          
          console.log(`[${item.tier}] Fetched ${data.content?.length || 0} items, filtered to ${itemsList.length} exact matches for "${item.name}"`);
          
          if (itemsList.length > 0) {
            const cheapest = itemsList.reduce((min: any, current: any) => {
              return current.cryptoPriceInfo.price < min.cryptoPriceInfo.price ? current : min;
            });
            
            const price = cheapest.cryptoPriceInfo.price;
            console.log(`[${item.tier}] Cheapest price found: ${price}`);
            
            if (marketPrices[item.tier as keyof typeof marketPrices].price !== price) {
              marketPrices[item.tier as keyof typeof marketPrices].price = price;
              marketPrices[item.tier as keyof typeof marketPrices].lastUpdated = Date.now();
              updated = true;
            }
          } else if (data.content && data.content.length > 0) {
            console.log(`[${item.tier}] Sample of names returned:`, data.content.slice(0, 3).map((x: any) => x.item?.name));
          }
        } else {
          console.error(`Failed to fetch ${item.tier} price:`, response.statusText);
        }
      } catch (error) {
        console.error(`Error fetching ${item.tier} price:`, error);
      }
      
      // Sleep for 1 second between requests to avoid IP bans
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (updated) {
      broadcastPrices();
    }
  };

  // Fetch all prices every 60 seconds
  setInterval(fetchAllPrices, 60000);
  // Initial fetch
  fetchAllPrices();

  wss.on("connection", (ws) => {
    // Send initial state
    ws.send(JSON.stringify({ type: "INIT", data: marketPrices }));

    ws.on("message", (message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.type === "UPDATE_PRICE") {
          const { tier, price } = payload.data;
          if (marketPrices[tier as keyof typeof marketPrices]) {
            marketPrices[tier as keyof typeof marketPrices].price = price;
            marketPrices[tier as keyof typeof marketPrices].lastUpdated = Date.now();
            broadcastPrices();
          }
        }
      } catch (e) {
        console.error("Error processing message:", e);
      }
    });
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
