import { Response } from 'express';

export interface GenericSSEWriter<T> {
  send: (event: T) => void;
  close: () => void;
}

export function createGenericSSE<T>(res: Response): GenericSSEWriter<T> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('event: connected\ndata: {}\n\n');

  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  const cleanup = () => {
    clearInterval(heartbeat);
  };

  return {
    send(event: T) {
      try {
        res.write(`event: progress\ndata: ${JSON.stringify(event)}\n\n`);
      } catch (err) {
        console.error('[SSE] Failed to write event:', err);
        cleanup();
      }
    },

    close() {
      cleanup();
      try {
        res.write('event: done\ndata: {}\n\n');
        res.end();
      } catch (err) {
        console.error('[SSE] Failed to close:', err);
      }
    },
  };
}
