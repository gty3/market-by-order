// This code runs on every message, this can be as often as 2000 times
// per second. Run with caution.

// The orderbook is available as mbp10.levels
// levels[0].ask_px will be best ask price, level[0].bid_px, will be best bid price


// If not currently in a trade
if (!state.userTrade) {
  // Reset stored prices when no trade
  store.lastOppositePrice = false
  
  if (!state.bidLimitOrder) {
    placeLimitOrder({
      type: "Bid",
      price: state.mbp10.levels[1].bid_px,
      stoploss: 4,
    })
  } else if (!state.offerLimitOrder) {
    placeLimitOrder({
      type: "Ask",
      price: state.mbp10.levels[1].ask_px,
      stoploss: 4,
    })
  }
} else {
  // If we have a trade, place opposite limit order only when first entering the trade
  if (state.userTrade.side === "Bid") {
    // We're long, check if we need to place/update ask limit
    if (!store.lastOppositePrice) {
      store.lastOppositePrice = true
      placeLimitOrder({
        type: "Ask",
        price: state.mbp10.levels[2].ask_px,
        stoploss: 4,
      })
    }
  } else if (state.userTrade.side === "Ask") {
    // We're short, check if we need to place/update bid limit
    if (!store.lastOppositePrice) {
      store.lastOppositePrice = true
      placeLimitOrder({
        type: "Bid",
        price: state.mbp10.levels[2].bid_px,
        stoploss: 4,
      })
    }
  }
}
