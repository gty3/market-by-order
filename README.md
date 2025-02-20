# Market By Order Trading Strategy Development

This repository contains tools and types for developing trading strategies that run within the DOM trading interface. The code here executes on every market data message, allowing you to create responsive trading algorithms.
Your trading strategy will have access to the following global objects:

- `state`: Contains current market data and order state
- `placeLimitOrder` and `placeMarketOrder`: Trading functions
- `store`: Persistent storage for variables across message runs


## State Object

The `state` object provides instrument and trade information as well as market data.
See `instruments.ts` for available attributes.

```typescript
    state.instrument: {         // Numbers represented in large numbers, divide by their respective multiplers
      symbol: string
      commission: number        // Trading fees in *1e4
      minPrice: number          // Minimum price fluctuation in *1e4
      increment: number         // Tick increment in *1e9
    }
    bidLimitOrder: {
      price: number             // Price is represented n *1e9 as well
      stoploss?: number         // Stoploss is represented in ticks
    } | null
    offerLimitOrder: {
      price: number
      stoploss?: number
    } | null
    userTrade: {
      price: number
      side: "Ask" | "Bid"
      stoploss?: number
    } | null
```
Market Data is in MBP10 format from Databento.
Additionally it includes an attributes parameter containing custom indicators.
Learn more about MBP10 at https://databento.com/docs/schemas-and-data-formats/mbp-10
```typescript
    state.mbp10: {
      hd: {                     // Databento Header
        length: number
        rtype: number
        publisher_id: number
        instrument_id: number
        ts_event: number        // Event time
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
        bid_px: number          // Bid price
        ask_px: number          // Ask price
        bid_sz: number          // Bid size
        ask_sz: number          // Ask size
        bid_ct: number          // Bid count
        ask_ct: number          // Ask count
      }>    
      attributes: {             // Custom Indicators, more information below
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



```

## Trading Functions

Place orders using these functions:

```typescript
// Place a limit order
placeLimitOrder({
    type: "Bid" | "Ask",
    price: number,             // Price is in same format as mbp10.price - *1e9
    stoploss?: number          // Number of ticks away from entry (eg 4)
})

// Place a market order
placeMarketOrder({
    type: "Buy" | "Sell"
})
```

## Storing State Between Messages

Since your code runs on every message, use the global `store` object to maintain state:

```typescript
// Initialize store variables (runs once)
if (!store.myVariable) {
    store.myVariable = 0
}

// Update store variables (persists across messages)
store.myVariable += 1

// Access stored variables
if (store.myVariable > 10) {
    // Take action
}
```

## Example Strategy

Here's a simple mean reversion strategy:

```typescript
// Initialize storage
if (!store.lastPrices) {
    store.lastPrices = []
}

// Update price history
const midPrice = (state.mbp10.levels[0].bid_px + state.mbp10.levels[0].ask_px) / 2
store.lastPrices.push(midPrice)
if (store.lastPrices.length > 20) {
    store.lastPrices.shift()
}

// Calculate simple moving average
const sma = store.lastPrices.reduce((a, b) => a + b, 0) / store.lastPrices.length

// Trading logic
if (!state.userTrade) {
    if (midPrice < sma * 0.995) {
        // Price is below SMA - buy
        placeMarketOrder({ type: "Buy" })
    } else if (midPrice > sma * 1.005) {
        // Price is above SMA - sell
        placeMarketOrder({ type: "Sell" })
    }
}
```

## Custom Indicators

The `state.mbp10.attributes` object provides advanced market metrics:

- `bid_density/ask_density`: Average amount of contracts traded per limit order
- `buy_density/sell_density`: Average amount of contracts traded per market order
- `bid_pull_rate/ask_pull_rate`: Average number of order cancellations within 1ms of a trade on the same side
- `bid_stack_rate/ask_stack_rate`: Average number of orders added within 1ms of a trade on the same side

Use these metrics to create more sophisticated trading strategies based on order book dynamics.


## Platform Limitations
**Only 1 trade can be opened at a time - you cannot place a bid limit while long**

**Limit orders are filled when an opposing bid or ask becomes available at that price - eg your limit orders are only filled by opposing limit orders**

**Stop orders and market orders do not incorporate slippage**

**Code does not save on the frontend, save your code separately**