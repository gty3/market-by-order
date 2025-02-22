// @ts-check
/// <reference path="../types.d.ts" />

/**
 * Small Move Reversal
 *
 * This strategy places orders when:
 * 1. Price moves down 3 ticks and bid density increases 10% (places Bid)
 * 2. Price moves up 3 ticks and ask density increases 10% (places Ask)
 * 
 * Risk Management:
 * - Stoploss: 4 ticks
 * - Take Profit: 4 ticks (implemented via opposing limit order)
 * - Cleanup: Cancel outstanding orders by placing same-side limit at same price
 */

class PriceMovementTracker {
  priceHistory = []
  bidDensityHistory = []
  askDensityHistory = []
  tickSize
  timeWindowSeconds = 8

  constructor(instrument, timeWindowSeconds = 8) {
    this.tickSize = instrument.increment
    this.timeWindowSeconds = timeWindowSeconds
  }

  update(currentPrice, currentBidDensity, currentAskDensity) {
    const now = Date.now()
    
    // Clean up old entries first
    this.cleanupOldEntries(now)

    // If this is our first entry
    if (this.priceHistory.length === 0) {
      this.priceHistory.push({
        timestamp: now,
        price: currentPrice
      })
      this.bidDensityHistory.push({
        timestamp: now,
        density: currentBidDensity
      })
      this.askDensityHistory.push({
        timestamp: now,
        density: currentAskDensity
      })
      return {
        ticksMoved: 0,
        bidDensityChangePercent: 0,
        askDensityChangePercent: 0
      }
    }

    // Get reference points (oldest entries in our window)
    const priceReference = this.priceHistory[0]
    const bidDensityReference = this.bidDensityHistory[0]
    const askDensityReference = this.askDensityHistory[0]
    
    // Calculate changes
    const ticksMoved = (currentPrice - priceReference.price) / this.tickSize
    
    // Calculate density changes with protection against division by zero
    const bidDensityChangePercent = bidDensityReference.density === 0 ? 0 : 
      ((currentBidDensity - bidDensityReference.density) / bidDensityReference.density) * 100
    const askDensityChangePercent = askDensityReference.density === 0 ? 0 : 
      ((currentAskDensity - askDensityReference.density) / askDensityReference.density) * 100

    // Add new entries
    this.priceHistory.push({
      timestamp: now,
      price: currentPrice
    })
    this.bidDensityHistory.push({
      timestamp: now,
      density: currentBidDensity
    })
    this.askDensityHistory.push({
      timestamp: now,
      density: currentAskDensity
    })

    return {
      ticksMoved,
      bidDensityChangePercent,
      askDensityChangePercent
    }
  }

  cleanupOldEntries(currentTime) {
    const cutoffTime = currentTime - (this.timeWindowSeconds * 1000)
    this.priceHistory = this.priceHistory.filter(entry => entry.timestamp >= cutoffTime)
    this.bidDensityHistory = this.bidDensityHistory.filter(entry => entry.timestamp >= cutoffTime)
    this.askDensityHistory = this.askDensityHistory.filter(entry => entry.timestamp >= cutoffTime)
  }

  reset() {
    this.priceHistory = []
    this.bidDensityHistory = []
    this.askDensityHistory = []
  }
}

// Initialize our store if it doesn't exist
if (!store.lastPrice) {
  store.lastPrice = 0
  store.lastAskDensity = 0
  store.lastBidDensity = 0
  store.priceDownCount = 0
  store.priceUpCount = 0
  store.askDensityUpCount = 0
  store.bidDensityUpCount = 0
  store.referenceBidDensity = 0
  store.referenceBidPrice = 0
  store.referenceAskDensity = 0  // Added for tracking ask density at order time
  store.referenceAskPrice = 0    // Added for tracking ask price at order time
  store.totalPriceDropIncrements = 0
  store.lastTicksMoved = null
  // Debug state tracking
  store.lastSignificantEvent = ""
  store.lastDensityChange = 0
  store.debugStats = {
    orderAttempts: 0,
    conditionsMet: 0
  }
  // Initialize price tracker with instrument info and 30 second window
  store.priceTracker = new PriceMovementTracker(state.instrument, 8)
}

// console.log("store.priceTracker", store.priceTracker, state.instrument.increment)
// Get current price and density from first level
const currentAskPrice = state.mbp10.levels[0].ask_px
const currentBidPrice = state.mbp10.levels[0].bid_px
const currentAskDensity = state.mbp10.attributes.ask_density
const currentBidDensity = state.mbp10.attributes.bid_density

// Track price movements and density changes - moved outside condition blocks to run always
const { ticksMoved, bidDensityChangePercent, askDensityChangePercent } = 
  store.priceTracker.update(currentBidPrice, currentBidDensity, currentAskDensity)

// Log changes when significant
if (store.lastTicksMoved !== ticksMoved) {
  console.log(
    `Ticks Moved: ${ticksMoved}, Bid Density Change: ${bidDensityChangePercent.toFixed(2)}%, Ask Density Change: ${askDensityChangePercent.toFixed(2)}%`
  )
  store.lastTicksMoved = ticksMoved
}

// Check if we're not already in a position
if (!state.userTrade && !state.offerLimitOrder && !state.bidLimitOrder) {
  // Check conditions for downward movement (place Bid)
  if (ticksMoved <= -3 && bidDensityChangePercent >= 8) {
    store.debugStats.conditionsMet++
    console.log(`Bid conditions met - Ticks: ${ticksMoved}, Initial Density Change: ${bidDensityChangePercent.toFixed(2)}%`)

    // Place buy limit order one tick away from current bid
    const orderPrice = currentBidPrice - state.instrument.increment
    placeLimitOrder({
      type: "Bid",
      price: orderPrice,
      stoploss: 4
    })
    
    // Store reference values for density tracking
    store.referenceBidPrice = orderPrice
    store.referenceBidDensity = currentBidDensity

    store.debugStats.orderAttempts++
  }
  // Check conditions for upward movement (place Ask)
  else if (ticksMoved >= 3 && askDensityChangePercent >= 8) {
    store.debugStats.conditionsMet++
    console.log(`Ask conditions met - Ticks: ${ticksMoved}, Initial Density Change: ${askDensityChangePercent.toFixed(2)}%`)

    // Place sell limit order one tick away from current ask
    const orderPrice = currentAskPrice + state.instrument.increment
    placeLimitOrder({
      type: "Ask",
      price: orderPrice,
      stoploss: 4
    })

    // Store reference values for density tracking
    store.referenceAskPrice = orderPrice
    store.referenceAskDensity = currentAskDensity

    store.debugStats.orderAttempts++
  }

  // Reset tracking if price reverses from current direction
  if ((ticksMoved > 0 && bidDensityChangePercent >= 5) || 
      (ticksMoved < 0 && askDensityChangePercent >= 5)) {
    store.priceTracker.reset()
  }
} else if (state.userTrade && !state.offerLimitOrder && !state.bidLimitOrder) {
  // Place take profit order when we have a position but no opposing limit order
  if (state.userTrade.side === "Bid") {
    // We're long, place take profit Ask order 4 ticks above entry
    const takeProfitPrice = state.userTrade.price + (state.instrument.increment * 4)
    placeLimitOrder({
      type: "Ask",
      price: takeProfitPrice,
      stoploss: 4
    })
  } else if (state.userTrade.side === "Ask") {
    // We're short, place take profit Bid order 4 ticks below entry
    const takeProfitPrice = state.userTrade.price - (state.instrument.increment * 4)
    placeLimitOrder({
      type: "Bid",
      price: takeProfitPrice,
      stoploss: 4
    })
  }
} else {
  // Handle outstanding limit orders - check for density decreases
  if (state.bidLimitOrder) {
    const bidDensityChangePercent = store.referenceBidDensity === 0 ? 0 :
      ((currentBidDensity - store.referenceBidDensity) / store.referenceBidDensity) * 100

    // Log density changes for active bid orders
    if (store.referenceBidDensity !== 0) {
      console.log(`Active Bid order - Price Movement: ${ticksMoved} ticks, Current Density Change: ${bidDensityChangePercent.toFixed(2)}%`)
    }

    if (bidDensityChangePercent <= -15) {
      console.log(`Cancelling Bid order - Price Movement: ${ticksMoved} ticks, Density decreased by ${Math.abs(bidDensityChangePercent).toFixed(2)}%`)
      // Cancel by placing same-side limit at same price
      placeLimitOrder({
        type: "Bid",
        price: store.referenceBidPrice,
        stoploss: 4
      })
      store.referenceBidDensity = 0
      store.referenceBidPrice = 0
    }
  }

  if (state.offerLimitOrder) {
    const askDensityChangePercent = store.referenceAskDensity === 0 ? 0 :
      ((currentAskDensity - store.referenceAskDensity) / store.referenceAskDensity) * 100

    // Log density changes for active ask orders
    if (store.referenceAskDensity !== 0) {
      console.log(`Active Ask order - Price Movement: ${ticksMoved} ticks, Current Density Change: ${askDensityChangePercent.toFixed(2)}%`)
    }

    if (askDensityChangePercent <= -15) {
      console.log(`Cancelling Ask order - Price Movement: ${ticksMoved} ticks, Density decreased by ${Math.abs(askDensityChangePercent).toFixed(2)}%`)
      // Cancel by placing same-side limit at same price
      placeLimitOrder({
        type: "Ask",
        price: store.referenceAskPrice,
        stoploss: 4
      })
      store.referenceAskDensity = 0
      store.referenceAskPrice = 0
    }
  }
}

// Update our stored values for next comparison
store.lastPrice = currentBidPrice
store.lastAskDensity = currentAskDensity
store.lastBidDensity = currentBidDensity
