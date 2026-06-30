import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'

type FetchHandler = (request: Request) => Promise<Response>

/**
 * Bridge a Web Fetch handler (the Unlink route kit returns `(Request) => Response`)
 * onto Express. Rebuilds a Fetch `Request` from the Express request (body already
 * parsed by `express.json()`), runs the handler, and streams the `Response` back.
 */
export function toExpress(handler: FetchHandler) {
  return async (req: ExpressRequest, res: ExpressResponse): Promise<void> => {
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value)
    }
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    const request = new Request(`http://localhost${req.originalUrl}`, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
    })

    const response = await handler(request)
    res.status(response.status)
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })
    res.send(await response.text())
  }
}
