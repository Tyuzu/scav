/**
 * API Type Definitions - Shared between Backend and Frontend
 * 
 * This file defines TypeScript interfaces for all API requests and responses.
 * Backend should validate against these patterns.
 * Frontend should use these for type safety.
 * 
 * Generated from: API_CONTRACTS.md
 * Last Updated: April 7, 2026
 */

// ============================================================================
// GENERAL TYPES
// ============================================================================

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
}

export interface ApiErrorResponse {
  message: string;
  error: string;
}

// All monetary amounts are in paise (smallest currency unit)
// 1 rupee = 100 paise
export type Paise = number; // Nominal type representing paise

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export namespace Auth {
  export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
  }

  export interface RegisterResponse {
    userid: string;
  }

  export interface LoginRequest {
    email: string;
    password: string;
  }

  export interface LoginResponse {
    token: string;
    userid: string;
  }

  export interface LogoutRequest {
    /* No body */
  }

  export interface RefreshRequest {
    /* No body */
  }
}

// ============================================================================
// USER PROFILE TYPES
// ============================================================================

export namespace User {
  export interface Profile {
    userid: string;
    username: string;
    email: string;
    phone_number?: string;
    bio?: string;
    avatar?: string;
    banner?: string;
    role?: string;
  }

  export interface EditProfileRequest extends FormData {
    // FormData fields:
    // - username?: string
    // - name?: string
    // - email?: string
    // - bio?: string
    // - phone_number?: string
    // - avatar?: File
    // - banner?: File
  }

  export interface EditProfileResponse extends Profile {}
}

// ============================================================================
// CART & CHECKOUT TYPES
// ============================================================================

export namespace Cart {
  export interface CartItem {
    itemId: string;
    itemName: string;
    quantity: number;
    price: Paise; // Price in paise
    category: "product" | "merchandise" | "menu";
    entityType: string; // "product", "merchandise", "menu", etc.
    entityId: string;
  }

  export interface CartResponse {
    products: CartItem[];
    merchandise: CartItem[];
    menu: CartItem[];
  }

  export interface AddToCartRequest {
    itemid: string;
    quantity: number;
    entitytype: string;
    entityid: string;
  }

  export interface AddToCartResponse {
    itemId: string;
    quantity: number;
  }

  export interface ValidateCouponRequest {
    coupon_code: string;
    cart_total: Paise;
  }

  export interface ValidateCouponResponse {
    valid: boolean;
    discount: Paise;
    discount_percent?: number;
    discounted_total?: Paise;
    reason?: string;
  }

  export interface CheckoutRequest {
    items: Array<{ itemId: string; quantity: number }>;
    coupon_code?: string;
    payment_method: "wallet" | "card" | "upi";
    address_id?: string;
  }

  export interface CheckoutResponse {
    orderid: string;
    status: string;
    total: Paise;
    discount: Paise;
    final_total: Paise;
    payment_status: string;
  }
}

// ============================================================================
// WALLET & PAYMENT TYPES
// ============================================================================

export namespace Wallet {
  export enum TransactionState {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded",
  }

  export enum TransactionType {
    TOPUP = "topup",
    PAYMENT = "payment",
    REFUND = "refund",
    TRANSFER = "transfer",
  }

  export interface BalanceResponse {
    balance: Paise;
    currency: string;
  }

  export interface TopupRequest {
    amount: Paise;
    payment_method: "card" | "upi" | "netbanking";
  }

  export interface TopupResponse {
    transaction_id: string;
    status: string;
    amount: Paise;
    currency: string;
  }

  export interface Transaction {
    transaction_id: string;
    amount: Paise;
    state: TransactionState;
    type: TransactionType;
    method: string;
    currency: string;
    timestamp: string; // ISO 8601
    description?: string;
  }

  export interface TransactionsResponse {
    transactions: Transaction[];
  }

  export interface PayRequest {
    amount: Paise;
    order_id: string;
  }

  export interface PayResponse {
    transaction_id: string;
    status: string;
    amount: Paise;
  }

  export interface TransferRequest {
    recipient_id: string;
    amount: Paise;
    note?: string;
  }

  export interface TransferResponse {
    transaction_id: string;
    recipient_id: string;
    amount: Paise;
  }
}

// ============================================================================
// EVENTS & TICKETING TYPES
// ============================================================================

export namespace Event {
  export interface Artist {
    artistid: string;
    name: string;
  }

  export interface Ticket {
    ticketid: string;
    name: string;
    price: Paise; // Price in paise
    quantity: number;
    sold: number;
    seats?: Seat[];
  }

  export interface Seat {
    seatid?: string;
    number: string;
    status: "available" | "booked" | "reserved";
  }

  export interface Merchandise {
    merchid: string;
    name: string;
    price: Paise; // Price in paise
    quantity?: number;
    sold?: number;
  }

  export interface FAQ {
    question: string;
    answer: string;
  }

  export interface ContactInfo {
    email?: string;
    phone?: string;
    organizer_name?: string;
  }

  export interface News {
    id: string;
    title: string;
    content: string;
    timestamp: string; // ISO 8601
  }

  export interface Poll {
    id: string;
    question: string;
    options: Array<{
      text: string;
      votes: number;
    }>;
  }

  export interface LostFound {
    id: string;
    type: "lost" | "found";
    description: string;
    contact: string;
  }

  export interface Event {
    eventid: string;
    title: string;
    description?: string;
    date: string; // ISO 8601
    location?: string;
    placeid?: string;
    artists?: Artist[];
    tickets: Ticket[];
    merchandise?: Merchandise[];
    faqs?: FAQ[];
    contactInfo?: ContactInfo;
    news?: News[];
    polls?: Poll[];
    lostfound?: LostFound[];
  }

  export interface EventsResponse {
    events: Event[];
    page: number;
    limit: number;
    total: number;
  }
}

export namespace Ticket {
  export interface ConfirmPurchaseRequest {
    quantity: number;
    seat_preferences?: Array<{
      seatstart: string;
      seatend: string;
    }>;
  }

  export interface PurchasedTicket {
    ticketid: string;
    seats: string[];
    qr_code: string; // URL or base64
  }

  export interface ConfirmPurchaseResponse {
    order_id: string;
    tickets: PurchasedTicket[];
    total_paid: Paise;
  }
}

// ============================================================================
// UTILITY FUNCTIONS (MUST BE USED IN FRONTEND)
// ============================================================================

/**
 * Use this function to convert paise to rupees for display
 * Example: formatCurrency(500000) => "₹5,000.00"
 */
export function formatCurrency(paise: Paise): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

/**
 * Use this function to convert rupees to paise for API requests
 * Example: toPaise(5000) => 500000
 */
export function toPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

/**
 * Use this function only when need to convert paise to rupees (rare)
 * Example: toRupees(500000) => 5000
 */
export function toRupees(paise: Paise): number {
  return paise / 100;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const ApiValidation = {
  /**
   * Validates email format
   */
  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /**
   * Validates Indian phone number
   */
  isValidIndianPhone(phone: string): boolean {
    return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""));
  },

  /**
   * Validates amount is positive paise
   */
  isValidAmount(paise: Paise): boolean {
    return paise > 0 && Number.isInteger(paise);
  },

  /**
   * Validates UUID format
   */
  isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uuid
    );
  },
};

// ============================================================================
// EXPORT ERROR TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError extends Error {
  status: number;
  data: ApiErrorResponse;
  validationErrors?: ValidationError[];
}

