const rateLimit = (options: {
  interval: number;
  uniqueTokenPerInterval: number;
}) => {
  const tokenCache = new Map<
    string,
    { count: number; lastReset: number }
  >();

  return {
    check: (
      limit: number,
      token: string
    ): { success: boolean; remaining: number } => {
      const now = Date.now();
      const tokenData = tokenCache.get(token);

      if (!tokenData || now - tokenData.lastReset > options.interval) {
        tokenCache.set(token, { count: 1, lastReset: now });
        return { success: true, remaining: limit - 1 };
      }

      if (tokenData.count >= limit) {
        return { success: false, remaining: 0 };
      }

      tokenData.count++;
      return { success: true, remaining: limit - tokenData.count };
    },
  };
};

// Pre-configured limiters
export const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export const authLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 100,
});
