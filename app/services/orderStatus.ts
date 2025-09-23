// Ultra-readable order status utilities and a single safe updater.
// This wraps the backend contract: PATCH /api/orders/:orderId/status { status }

import { ordersAPI } from './api';

// These are the only allowed status values.
// Keeping this as a closed set prevents typos like "cancelled".
export type OrderStatus = 'pending' | 'accepted' | 'paid' | 'completed' | 'canceled';

// This tiny map mirrors the backend's rule for allowed moves.
// If the UI only allows these, the API will say "yes" and life is good.
const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
	pending: ['accepted', 'canceled'],
	accepted: ['paid', 'canceled'],
	paid: ['completed', 'canceled'],
	completed: [],
	canceled: [],
};

// Simple checker you can call before enabling any action buttons.
export function canTransition(current: OrderStatus, next: OrderStatus): boolean {
	return allowedTransitions[current]?.includes(next) ?? false;
}

// One helper for all status updates. Use it for 'accepted' | 'canceled' | 'paid' | 'completed'.
// Extremely readable; explains itself; safe to reuse anywhere in the app.
export async function setOrderStatus({
	orderId, // which order to change
	status, // 'accepted' | 'canceled' | 'paid' | 'completed'
}: {
	orderId: string;
	status: Exclude<OrderStatus, 'pending'>;
}) {
	// Make the request via our authenticated API client.
	const res = await ordersAPI.updateStatus(orderId, status);

	// Turn any error into a clear, actionable message for the UI.
	if (!res.success) {
		throw new Error(
			`Could not set order ${orderId} to "${status}": ${res.error ?? 'Unknown error'}`,
		);
	}

	// On success, the server returns the updated order (with new status and timestamp).
	return res.data as any;
}


