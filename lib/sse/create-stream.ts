/**
 * Create an SSE ReadableStream with heartbeat and cleanup handling.
 */
export function createSSEStream(
  request: Request,
  setup: (helpers: {
    send: (event: string, data: unknown) => void;
    onAbort: (cleanup: () => void) => void;
  }) => void
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30000);

      const onAbort = (cleanup: () => void) => {
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          cleanup();
          controller.close();
        });
      };

      setup({ send, onAbort });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
