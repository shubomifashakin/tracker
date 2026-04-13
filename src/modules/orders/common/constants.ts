export function makeOrderStopKey(orderId: string) {
  return `order:${orderId}:current_stop`;
}

export function makeDriverPingKey(
  driverId: string,
  orderId: string,
  stopId: string,
) {
  return `driver:${driverId}:ping:${orderId}:${stopId}`;
}

export const BUFFER_MS = 15000;
