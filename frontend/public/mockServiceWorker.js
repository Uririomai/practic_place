/* eslint-disable */
/* tslint:disable */

/**
 * Mock Service Worker.
 * For more information, please visit https://mswjs.io
 */
const PACKAGE_VERSION = '2.14.6'
const INTEGRITY_CHECKSUM = '4db4a41e972cec1b64cc569c66952d82'
const IS_MOCKED_RESPONSE = Symbol('isMockedResponse')
const activeClientIds = new Set()

addEventListener('install', function () {
  self.skipWaiting()
})

addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

addEventListener('message', async function (event) {
  const clientId = Reflect.get(event.source || {}, 'id')
  if (!clientId || !self.clients) return
  const client = await self.clients.get(clientId)
  if (!client) return
  const allClients = await self.clients.matchAll({ type: 'window' })

  switch (event.data) {
    case 'KEEPALIVE_REQUEST':
      sendToClient(client, { type: 'KEEPALIVE_RESPONSE' })
      break
    case 'INTEGRITY_CHECK_REQUEST':
      sendToClient(client, {
        type: 'INTEGRITY_CHECK_RESPONSE',
        payload: { packageVersion: PACKAGE_VERSION, checksum: INTEGRITY_CHECKSUM }
      })
      break
    case 'MOCK_ACTIVATE':
      activeClientIds.add(clientId)
      sendToClient(client, {
        type: 'MOCKING_ENABLED',
        payload: { client: { id: client.id, frameType: client.frameType } }
      })
      break
    case 'CLIENT_CLOSED':
      activeClientIds.delete(clientId)
      const remainingClients = allClients.filter(c => c.id !== clientId)
      if (remainingClients.length === 0) self.registration.unregister()
      break
  }
})

addEventListener('fetch', function (event) {
  if (event.request.mode === 'navigate') return
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return
  if (activeClientIds.size === 0) return
  const requestId = crypto.randomUUID()
  event.respondWith(handleRequest(event, requestId, Date.now()))
})

async function handleRequest(event, requestId) {
  const client = await resolveMainClient(event)
  const response = await getResponse(event, client)
  if (client && activeClientIds.has(client.id)) {
    sendToClient(client, {
      type: 'RESPONSE',
      payload: {
        isMockedResponse: IS_MOCKED_RESPONSE in response,
        request: await serializeRequest(event.request),
        response: {
          type: response.type, status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: response.body
        }
      }
    })
  }
  return response
}

async function resolveMainClient(event) {
  const client = await self.clients.get(event.clientId)
  if (activeClientIds.has(event.clientId)) return client
  if (client?.frameType === 'top-level') return client
  const allClients = await self.clients.matchAll({ type: 'window' })
  return allClients.filter(c => c.visibilityState === 'visible')
    .find(c => activeClientIds.has(c.id))
}

async function getResponse(event, client) {
  function passthrough() {
    return fetch(event.request.clone())
  }
  if (!client || !activeClientIds.has(client.id)) return passthrough()
  const serializedRequest = await serializeRequest(event.request)
  const clientMessage = await sendToClient(client, {
    type: 'REQUEST',
    payload: { id: crypto.randomUUID(), ...serializedRequest }
  })
  if (clientMessage.type === 'MOCK_RESPONSE') return respondWithMock(clientMessage.data)
  return passthrough()
}

function sendToClient(client, message) {
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = (event) => resolve(event.data)
    client.postMessage(message, [channel.port2])
  })
}

function respondWithMock(response) {
  const mockedResponse = new Response(response.body, response)
  Reflect.defineProperty(mockedResponse, IS_MOCKED_RESPONSE, { value: true, enumerable: true })
  return mockedResponse
}

async function serializeRequest(request) {
  return {
    url: request.url, mode: request.mode, method: request.method,
    headers: Object.fromEntries(request.headers.entries()), body: await request.arrayBuffer()
  }
}