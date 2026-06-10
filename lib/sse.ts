type SSEController = ReadableStreamDefaultController

interface SSEConnection {
  controller: SSEController
  userId: string
  role: string
  region?: string
}

const connections = new Map<string, Set<SSEConnection>>()

export function registerConnection(
  userId: string,
  role: string,
  controller: SSEController,
  region?: string
): SSEConnection {
  const conn: SSEConnection = { controller, userId, role, region }
  if (!connections.has(userId)) {
    connections.set(userId, new Set())
  }
  connections.get(userId)!.add(conn)
  return conn
}

export function removeConnection(userId: string, conn: SSEConnection): void {
  const userConns = connections.get(userId)
  if (userConns) {
    userConns.delete(conn)
    if (userConns.size === 0) {
      connections.delete(userId)
    }
  }
}

function formatSSE(event: { type: string; data: object }): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
}

export function sendToUser(userId: string, event: { type: string; data: object }): void {
  const userConns = connections.get(userId)
  if (!userConns) return
  const message = formatSSE(event)
  for (const conn of userConns) {
    try {
      conn.controller.enqueue(new TextEncoder().encode(message))
    } catch {
      userConns.delete(conn)
    }
  }
}

export function sendToRole(role: string, event: { type: string; data: object }): void {
  const message = formatSSE(event)
  for (const [, userConns] of connections) {
    for (const conn of userConns) {
      if (conn.role === role) {
        try {
          conn.controller.enqueue(new TextEncoder().encode(message))
        } catch {
          userConns.delete(conn)
        }
      }
    }
  }
}

export function sendToRegion(region: string, event: { type: string; data: object }): void {
  const message = formatSSE(event)
  for (const [, userConns] of connections) {
    for (const conn of userConns) {
      if (conn.region === region || conn.role === 'admin') {
        try {
          conn.controller.enqueue(new TextEncoder().encode(message))
        } catch {
          userConns.delete(conn)
        }
      }
    }
  }
}
