// Density Momentum Trading Strategy
// Tracks price movements and density changes to identify trading opportunities

class PriceMovementTracker {
  referencePrice = 0;
  downwardTicks = 0;
  tickSize;

  constructor(instrument) {
    this.tickSize = instrument.increment;
  }

  update(currentPrice) {
    // Initialize reference price if not set
    if (this.referencePrice === 0) {
      this.referencePrice = currentPrice;
      return { downwardTicks: 0 };
    }

    // Calculate ticks moved
    const ticksMoved = Math.round((currentPrice - this.referencePrice) / this.tickSize);

    // Update downward movement count
    if (ticksMoved < 0) {
      this.downwardTicks += Math.abs(ticksMoved);
    } else if (currentPrice === this.referencePrice - this.tickSize) {
      // Reset if price returns to one tick before the reference
      this.downwardTicks = 0;
    }

    return {
      downwardTicks: this.downwardTicks
    };
  }

  reset() {
    this.referencePrice = 0;
    this.downwardTicks = 0;
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
  store.totalPriceDropIncrements = 0
  // Debug state tracking
  store.lastSignificantEvent = ''
  store.lastDensityChange = 0
  store.debugStats = {
    orderAttempts: 0,
    densityThresholdMet: 0,
    priceThresholdMet: 0
  }
  // Initialize price tracker with instrument info
  store.priceTracker = new PriceMovementTracker(state.instrument)
}

// Get current price and density from first level
const currentAskPrice = state.mbp10.levels[0].ask_px
const currentBidPrice = state.mbp10.levels[0].bid_px
const currentAskDensity = state.mbp10.attributes.ask_density
const currentBidDensity = state.mbp10.attributes.bid_density

// Check if we're not already in a position
if (!state.userTrade && !state.offerLimitOrder && !state.bidLimitOrder) {
  // Track price movements using our new tracker
  const priceMovement = store.priceTracker.update(currentBidPrice)
  
  // Alert when price has moved down 3 ticks
  if (priceMovement.downwardTicks >= 3) {
    console.log(`Alert: Price has moved down ${priceMovement.downwardTicks} ticks`)
    // You can add additional actions here, such as placing an order or logging
  }

  // Start tracking if we haven't started yet
  if (store.referenceBidDensity === 0) {
    store.referenceBidDensity = currentBidDensity
    store.lastSignificantEvent = 'Started tracking new reference point'
  }

  // Calculate density percentage change
  const densityPercentageChange = store.referenceBidDensity > 0 
    ? ((currentBidDensity - store.referenceBidDensity) / store.referenceBidDensity) * 100
    : 0

  // Track significant changes
  if (Math.abs(densityPercentageChange - store.lastDensityChange) > 1) {
    store.lastDensityChange = densityPercentageChange
    store.lastSignificantEvent = `Density changed to ${densityPercentageChange.toFixed(2)}%, Price movement: ${priceMovement.downwardTicks} ticks down`
  }

  // Update debug stats
  if (priceMovement.downwardTicks >= 3) store.debugStats.priceThresholdMet++
  if (densityPercentageChange >= 10) store.debugStats.densityThresholdMet++

  // Check conditions: price dropped by 3 increments and density increased by 10%
  if (priceMovement.downwardTicks >= 3 && densityPercentageChange >= 10) {
    store.debugStats.orderAttempts++
    store.lastSignificantEvent = `Order placed: price drop=${priceMovement.downwardTicks} ticks, density change=${densityPercentageChange.toFixed(2)}%`
    
    // Place buy limit order at current bid
    placeLimitOrder({
      type: "Bid",
      price: currentBidPrice,
      stoploss: 4
    })
    
    // Reset tracking after order placed
    store.referenceBidDensity = 0
    store.priceTracker.reset()
  }

  // Reset tracking if density drops significantly or price moves up
  if (densityPercentageChange < -5 || priceMovement.downwardTicks > 0) {
    store.lastSignificantEvent = `Reset tracking: density=${densityPercentageChange.toFixed(2)}%, downward ticks=${priceMovement.downwardTicks}`
    store.referenceBidDensity = 0
    store.priceTracker.reset()
  }

  // Check for price movement and density increase
  if (store.lastPrice > 0) { // Make sure we have a previous price
    // Check ask side conditions (price down + ask density up)
    const priceMovedDown = currentAskPrice < store.lastPrice
    const askDensityIncreased = currentAskDensity > store.lastAskDensity

    if (priceMovedDown && askDensityIncreased) {
      store.priceDownCount++
      store.askDensityUpCount++
    } else {
      // Reset ask side counters if conditions not met
      store.priceDownCount = 0
      store.askDensityUpCount = 0
    }

    // Check bid side conditions (price up + bid density up)
    const priceMovedUp = currentBidPrice > store.lastPrice
    const bidDensityIncreased = currentBidDensity > store.lastBidDensity

    if (priceMovedUp && bidDensityIncreased) {
      store.priceUpCount++
      store.bidDensityUpCount++
    } else {
      // Reset bid side counters if conditions not met
      store.priceUpCount = 0
      store.bidDensityUpCount = 0
    }

    // Check if we should place an ask limit order
    if (store.priceDownCount >= 1 && store.askDensityUpCount >= 1) {
      // Place sell limit order at next price level
      const nextAskPrice = currentAskPrice + state.instrument.increment
      placeLimitOrder({
        type: "Ask",
        price: nextAskPrice,
        stoploss: 4 // Add stoploss for risk management
      })
      
      // Reset ask side counters after placing order
      store.priceDownCount = 0
      store.askDensityUpCount = 0
    }

    // Check if we should place a bid limit order
    if (store.priceUpCount >= 1 && store.bidDensityUpCount >= 1) {
      // Place buy limit order at next price level
      const nextBidPrice = currentBidPrice - state.instrument.increment
      placeLimitOrder({
        type: "Bid",
        price: nextBidPrice,
        stoploss: 4 // Add stoploss for risk management
      })
      
      // Reset bid side counters after placing order
      store.priceUpCount = 0
      store.bidDensityUpCount = 0
    }
  }
}

// Update our stored values for next comparison
store.lastPrice = currentBidPrice // Use bid price as reference
store.lastAskDensity = currentAskDensity
store.lastBidDensity = currentBidDensity 