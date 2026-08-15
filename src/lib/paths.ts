/** Canonical existing ForkFleet RTDB paths. Do not invent alternates. */
export const paths = {
  drivers: "drivers",
  driver: (driverId: string) => `drivers/${driverId}`,
  driverLive: (orderId: string) => `drivers/live/${orderId}`,
  assignments: "driverAssignments",
  assignment: (key: string) => `driverAssignments/${key}`,
  orders: "orders",
  order: (orderId: string) => `orders/${orderId}`,
  orderEvents: (orderId: string) => `orderEvents/${orderId}`,
  orderEvent: (orderId: string, eventId: string) => `orderEvents/${orderId}/${eventId}`,
  restaurants: "restaurants",
  restaurant: (restaurantId: string) => `restaurants/${restaurantId}`,
  branches: (restaurantId: string) => `restaurants/${restaurantId}/branches`,
  notifications: (driverId: string) => `notifications/drivers/${driverId}`,
  support: "support/tickets",
  supportTicket: (ticketId: string) => `support/tickets/${ticketId}`,
  earnings: (driverId: string) => `driverEarnings/${driverId}`,
  earning: (driverId: string, orderId: string) => `driverEarnings/${driverId}/${orderId}`,
  wallet: (driverId: string) => `driverWallet/${driverId}/transactions`,
  walletTx: (driverId: string, txId: string) => `driverWallet/${driverId}/transactions/${txId}`,
  chat: (orderId: string) => `deliveryChats/${orderId}/messages`,
};

export function assignmentKey(driverId: string, restaurantId: string, branchId: string) {
  return `${driverId}__${restaurantId}__${branchId}`;
}
