/**
 * ALIGNMENT FIXES - Frontend Payment & Wallet Services
 * 
 * Critical Issue: Monetary units inconsistency
 * Backend stores values in base units (rupees as float, paise as int64)
 * Frontend must handle conversion correctly
 * 
 * Solution: All amounts should be stored as paise (10 INR = 1000 paise)
 * and converted for display using formatCurrency utility
 */

import { formatCurrency, toRupees } from "../../types/api.types.ts";

/**
 * FIX 1: Wallet Transactions Display
 * Before: amount.toLocaleString() displayed raw paise/rupees incorrectly
 * After: Divide by 100 and format as currency
 */
export function formatTransactionAmount(amount, currency = "INR") {
  return formatCurrency(amount); // Uses api.types utility
}

/**
 * FIX 2: Cart Item Price Display
 * Before: ticket.price / 100 divided already-rupee values
 * After: Price field indicates unit in model/API response
 * If backend sends price in rupees (float64): display directly
 * If backend sends price in paise (int64): divide by 100
 */
export function formatCartItemPrice(item) {
  // Assume backend sends prices in paise (smallest unit)per API_CONTRACTS.md
  if (typeof item.price === 'number') {
    return formatCurrency(item.price); // item.price in paise
  }
  return `${item.currency || 'INR'} ${item.price}`;
}

/**
 * FIX 3: Coupon Validation
 * Before: Coupon code passed to order but never validated
 * After: Validate coupon before checkout
 */
export async function validateCouponCode(couponCode, cartTotal) {
  if (!couponCode || couponCode.trim().length === 0) {
    return { valid: false, discount: 0 };
  }
  
  try {
    const response = await fetch('/api/v1/cart/validate-coupon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        coupon_code: couponCode,
        cart_total: cartTotal // in paise
      })
    });

    if (!response.ok) {
      return { valid: false, discount: 0, reason: 'Coupon validation failed' };
    }

    const data = await response.json();
    return data.data || { valid: false, discount: 0 };
  } catch (error) {
    console.error('Coupon validation error:', error);
    return { valid: false, discount: 0, reason: error.message };
  }
}

/**
 * FIX 4: Balance Display
 * Wallet balance should always be displayed in rupees (paise / 100)
 */
export function formatWalletBalance(balanceInPaise) {
  return formatCurrency(balanceInPaise); // Converts paise to rupees
}

/**
 * FIX 5: Transaction List Response Format
 * Standardize response wrapper to always have .data.transactions
 */
export function normalizeTransactionResponse(response) {
  // Handle different response formats from backend
  if (response && response.data && response.data.transactions) {
    return response.data.transactions;
  } else if (response && Array.isArray(response)) {
    return response;
  } else if (response && response.transactions && Array.isArray(response.transactions)) {
    return response.transactions;
  }
  return [];
}

// ============================================================================
// PAYMENT CHECKOUT HELPER
// ============================================================================

/**
 * Calculate order totals with proper paise handling
 */
export function calculateOrderTotals(items, couponDiscount = 0) {
  // All amounts in paise
  let subtotal = 0;
  
  items.forEach(item => {
    // price is in paise, quantity is count
    subtotal += item.price * item.quantity;
  });

  const tax = Math.round(subtotal * 0.18); // 18% GST
  const total = subtotal + tax - couponDiscount;

  return {
    subtotal,
    tax,
    discount: couponDiscount,
    total,
    // For display
    display: {
      subtotal: formatCurrency(subtotal),
      tax: formatCurrency(tax),
      discount: formatCurrency(couponDiscount),
      total: formatCurrency(total)
    }
  };
}

/**
 * Topup request should return transaction ID for receipt
 */
export async function requestWalletTopup(amount, paymentMethod) {
  const response = await fetch('/api/v1/wallet/topup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({
      amount, // in paise
      payment_method: paymentMethod
    })
  });

  if (!response.ok) throw new Error('Topup failed');
  
  const data = await response.json();
  
  // Ensure we have transaction_id for receipt
  if (!data.data || !data.data.transaction_id) {
    console.warn('Backend topup did not return transaction_id');
  }
  
  return data.data;
}

