/**
 * Type definitions for the market-by-order trading platform
 */

/**
 * Market data level information
 */

export interface Instrument {
  symbol: string
  commission: number
  minPrice: number
  increment: number
}
interface Level {
  ask_px: number;
  ask_qty: number;
  bid_px: number;
  bid_qty: number;
}

/**
 * Market data attributes
 */
interface MBP10Attributes {
  ask_density: number;
  bid_density: number;
  spread: number;
  mid_price: number;
}

/**
 * Market-by-price data structure
 */
interface MBP10 {
  levels: Level[];
  attributes: MBP10Attributes;
}

/**
 * Trade information
 */
interface Trade {
  side: "Bid" | "Ask";
  price: number;
  qty: number;
  timestamp: number;
}

/**
 * Limit order information
 */
interface LimitOrder {
  side: "Bid" | "Ask";
  price: number;
  qty: number;
  timestamp: number;
  stoploss?: number;
}

/**
 * Global state object
 */
interface State {
  mbp10: MBP10;
  instrument: Instrument;
  userTrade: Trade | null;
  bidLimitOrder: LimitOrder | null;
  offerLimitOrder: LimitOrder | null;
}

/**
 * Global store object for persisting algorithm state
 */
interface Store {
  [key: string]: any;
}

/**
 * Limit order parameters
 */
interface LimitOrderParams {
  type: "Bid" | "Ask";
  price: number;
  stoploss?: number;
}

/**
 * Market order parameters
 */
type MarketOrderParams = "Buy" | "Sell";

/**
 * Global variables and functions
 */
declare const state: State;
declare const store: Store;
declare function placeLimitOrder(params: LimitOrderParams): void;
declare function placeMarketOrder(params: MarketOrderParams): void;

declare global {
  var placeLimitOrder: (params: {
    type: "Bid" | "Ask"
    price: number
    stoploss?: number
  }) => void

  var placeMarketOrder: (params: {
    type: "Buy" | "Sell"
    // stoploss?: number
  }) => void

  var store: {
    [key: string]: any
  }

  var state: {
    userTrade: {
      price: number
      side: "Ask" | "Bid"
      stoploss?: number
    } | null
    bidLimitOrder: {
      price: number
      stoploss?: number
    } | null
    offerLimitOrder: {
      price: number
      stoploss?: number
    } | null
    instrument: {
      symbol: string
      commission: number
      minPrice: number
      increment: number
    }
    mbp10: {
      hd: {
        length: number
        rtype: number
        publisher_id: number
        instrument_id: number
        ts_event: number
      }
      price: number
      size: number
      action: "Add" | "Cancel" | "Modify" | "Trade" | "Fill"
      side: "Ask" | "Bid" | "None"
      flags: number
      depth: number
      ts_recv: number
      ts_in_delta: number
      sequence: number
      levels: Array<{
        bid_px: number
        ask_px: number
        bid_sz: number
        ask_sz: number
        bid_ct: number
        ask_ct: number
      }>
      attributes: {
        bid_density: number
        ask_density: number
        buy_density: number
        sell_density: number
        bid_pull_rate: number
        ask_pull_rate: number
        bid_stack_rate: number
        ask_stack_rate: number
      }
    }
  }
}

export {}
