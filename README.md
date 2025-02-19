# Market By Order Trading Strategy Development

This repository contains tools and types for developing trading strategies that run within the DOM trading interface. The code here executes on every market data message, allowing you to create responsive trading algorithms.

## Getting Started

Your trading strategy will have access to the following global objects:

- `state`: Contains current market data and order state
- `store`: Persistent storage for variables across message runs
- Trading functions: `placeLimitOrder` and `placeMarketOrder`

### State Object

The `state` object provides real-time market information and current order status:

```typescript
state.mbp10: {
    // Market by price data with 10 levels
    levels: Array<{
        bid_px: number    // Bid price at level
        ask_px: number    // Ask price at level
        bid_sz: number    // Bid size
        ask_sz: number    // Ask size
        bid_ct: number    // Bid count
        ask_ct: number    // Ask count
    }>
    attributes: {
        bid_density: number    // Current bid density
        ask_density: number    // Current ask density
        bid_pull_rate: number  // Rate of bid cancellations
        ask_pull_rate: number  // Rate of ask cancellations
        // ... other market metrics
    }
}

state.userTrade: {
    price: number
    side: "Ask" | "Bid"
    stoploss?: number
} | null

state.instrument: {
    symbol: string
    commission: number
    minPrice: number
    increment: number
}
```

### Trading Functions

Place orders using these functions:

```typescript
// Place a limit order
placeLimitOrder({
    type: "Bid" | "Ask",
    price: number,
    stoploss?: number
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

## Best Practices

1. **Always Check Current Position**
   ```typescript
   if (!state.userTrade) {
       // Safe to enter new position
   }
   ```

2. **Use Stoploss for Risk Management**
   ```typescript
   placeLimitOrder({
       type: "Bid",
       price: price,
       stoploss: 4  // Exit if price moves 4 ticks against you
   })
   ```

3. **Validate Market Data**
   ```typescript
   if (state.mbp10.levels.length > 0 && state.mbp10.levels[0].bid_px > 0) {
       // Safe to use price data
   }
   ```

4. **Optimize Performance**
   - Minimize complex calculations
   - Avoid creating large objects/arrays
   - Use simple conditional logic
   - Cache frequently used values

## Market Attributes

The `state.mbp10.attributes` object provides advanced market metrics:

- `bid_density/ask_density`: Measure of order book density
- `buy_density/sell_density`: Measure of trading activity
- `bid_pull_rate/ask_pull_rate`: Rate of order cancellations
- `bid_stack_rate/ask_stack_rate`: Rate of new orders

Use these metrics to create more sophisticated trading strategies based on order book dynamics.
