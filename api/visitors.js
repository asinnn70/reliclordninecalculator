// In-memory store for online users (Note: On Vercel, this resets on cold starts and isn't shared across instances)
// For a production app on Vercel, you would want to use Vercel KV (Redis) or Pusher.
const activeUsers = new Map();

export default async function handler(req, res) {
  const now = Date.now();
  const { id, action } = req.query;

  let totalVisitors = 0;

  try {
    // 1. Handle Total Visitors using a free public counter API
    if (action === 'visit') {
      // Increment counter
      const response = await fetch('https://api.counterapi.dev/v1/relic-lordnine/visitors/up');
      const data = await response.json();
      totalVisitors = data.count;
    } else {
      // Just get current count
      const response = await fetch('https://api.counterapi.dev/v1/relic-lordnine/visitors');
      const data = await response.json();
      totalVisitors = data.count || 0;
    }
  } catch (error) {
    console.error("Error fetching total visitors:", error);
  }

  // 2. Handle Online Visitors (Heartbeat)
  if (id) {
    activeUsers.set(id, now);
  }

  // Clean up users who haven't sent a heartbeat in the last 60 seconds
  for (const [key, lastSeen] of activeUsers.entries()) {
    if (now - lastSeen > 60000) {
      activeUsers.delete(key);
    }
  }

  return res.status(200).json({
    total: totalVisitors,
    online: Math.max(1, activeUsers.size) // Always show at least 1 (the current user)
  });
}
