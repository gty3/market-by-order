"use strict";
(() => {
  // lib/trackers/PriceMovementTracker.ts
  var PriceMovementTracker = class {
    constructor(instrument, timeWindowSeconds = 8) {
      this.priceHistory = [];
      this.bidDensityHistory = [];
      this.askDensityHistory = [];
      this.timeWindowSeconds = 8;
      this.tickSize = instrument.increment;
      this.timeWindowSeconds = timeWindowSeconds;
    }
    update(currentPrice, currentBidDensity2, currentAskDensity2) {
      const now = Date.now();
      this.cleanupOldEntries(now);
      if (this.priceHistory.length === 0) {
        this.priceHistory.push({
          timestamp: now,
          price: currentPrice
        });
        this.bidDensityHistory.push({
          timestamp: now,
          density: currentBidDensity2
        });
        this.askDensityHistory.push({
          timestamp: now,
          density: currentAskDensity2
        });
        return {
          ticksMoved: 0,
          bidDensityChangePercent: 0,
          askDensityChangePercent: 0
        };
      }
      const priceReference = this.priceHistory[0];
      const bidDensityReference = this.bidDensityHistory[0];
      const askDensityReference = this.askDensityHistory[0];
      const ticksMoved2 = (currentPrice - priceReference.price) / this.tickSize;
      const bidDensityChangePercent2 = bidDensityReference.density === 0 ? 0 : (currentBidDensity2 - bidDensityReference.density) / bidDensityReference.density * 100;
      const askDensityChangePercent2 = askDensityReference.density === 0 ? 0 : (currentAskDensity2 - askDensityReference.density) / askDensityReference.density * 100;
      this.priceHistory.push({
        timestamp: now,
        price: currentPrice
      });
      this.bidDensityHistory.push({
        timestamp: now,
        density: currentBidDensity2
      });
      this.askDensityHistory.push({
        timestamp: now,
        density: currentAskDensity2
      });
      return {
        ticksMoved: ticksMoved2,
        bidDensityChangePercent: bidDensityChangePercent2,
        askDensityChangePercent: askDensityChangePercent2
      };
    }
    cleanupOldEntries(currentTime) {
      const cutoffTime = currentTime - this.timeWindowSeconds * 1e3;
      this.priceHistory = this.priceHistory.filter((entry) => entry.timestamp >= cutoffTime);
      this.bidDensityHistory = this.bidDensityHistory.filter((entry) => entry.timestamp >= cutoffTime);
      this.askDensityHistory = this.askDensityHistory.filter((entry) => entry.timestamp >= cutoffTime);
    }
    reset() {
      this.priceHistory = [];
      this.bidDensityHistory = [];
      this.askDensityHistory = [];
    }
  };

  // algos/small-move-reversal.ts
  if (!store.lastPrice) {
    store.lastPrice = 0;
    store.lastAskDensity = 0;
    store.lastBidDensity = 0;
    store.priceDownCount = 0;
    store.priceUpCount = 0;
    store.askDensityUpCount = 0;
    store.bidDensityUpCount = 0;
    store.referenceBidDensity = 0;
    store.referenceBidPrice = 0;
    store.referenceAskDensity = 0;
    store.referenceAskPrice = 0;
    store.totalPriceDropIncrements = 0;
    store.lastTicksMoved = null;
    store.lastSignificantEvent = "";
    store.lastDensityChange = 0;
    store.debugStats = {
      orderAttempts: 0,
      conditionsMet: 0
    };
    store.priceTracker = new PriceMovementTracker(state.instrument, 8);
  }
  var currentAskPrice = state.mbp10.levels[0].ask_px;
  var currentBidPrice = state.mbp10.levels[0].bid_px;
  var currentAskDensity = state.mbp10.attributes.ask_density;
  var currentBidDensity = state.mbp10.attributes.bid_density;
  var { ticksMoved, bidDensityChangePercent, askDensityChangePercent } = store.priceTracker.update(currentBidPrice, currentBidDensity, currentAskDensity);
  if (store.lastTicksMoved !== ticksMoved) {
    console.log(
      `Ticks Moved: ${ticksMoved}, Bid Density Change: ${bidDensityChangePercent.toFixed(2)}%, Ask Density Change: ${askDensityChangePercent.toFixed(2)}%`
    );
    store.lastTicksMoved = ticksMoved;
  }
  if (!state.userTrade && !state.offerLimitOrder && !state.bidLimitOrder) {
    if (ticksMoved <= -3 && bidDensityChangePercent >= 8) {
      store.debugStats.conditionsMet++;
      console.log(`Bid conditions met - Ticks: ${ticksMoved}, Initial Density Change: ${bidDensityChangePercent.toFixed(2)}%`);
      const orderPrice = currentBidPrice - state.instrument.increment;
      placeLimitOrder({
        type: "Bid",
        price: orderPrice,
        stoploss: 4
      });
      store.referenceBidPrice = orderPrice;
      store.referenceBidDensity = currentBidDensity;
      store.debugStats.orderAttempts++;
    } else if (ticksMoved >= 3 && askDensityChangePercent >= 8) {
      store.debugStats.conditionsMet++;
      console.log(`Ask conditions met - Ticks: ${ticksMoved}, Initial Density Change: ${askDensityChangePercent.toFixed(2)}%`);
      const orderPrice = currentAskPrice + state.instrument.increment;
      placeLimitOrder({
        type: "Ask",
        price: orderPrice,
        stoploss: 4
      });
      store.referenceAskPrice = orderPrice;
      store.referenceAskDensity = currentAskDensity;
      store.debugStats.orderAttempts++;
    }
    if (ticksMoved > 0 && bidDensityChangePercent >= 5 || ticksMoved < 0 && askDensityChangePercent >= 5) {
      store.priceTracker.reset();
    }
  } else if (state.userTrade && !state.offerLimitOrder && !state.bidLimitOrder) {
    if (state.userTrade.side === "Bid") {
      const takeProfitPrice = state.userTrade.price + state.instrument.increment * 4;
      placeLimitOrder({
        type: "Ask",
        price: takeProfitPrice,
        stoploss: 4
      });
    } else if (state.userTrade.side === "Ask") {
      const takeProfitPrice = state.userTrade.price - state.instrument.increment * 4;
      placeLimitOrder({
        type: "Bid",
        price: takeProfitPrice,
        stoploss: 4
      });
    }
  } else {
    if (state.bidLimitOrder) {
      const bidDensityChangePercent2 = store.referenceBidDensity === 0 ? 0 : (currentBidDensity - store.referenceBidDensity) / store.referenceBidDensity * 100;
      if (store.referenceBidDensity !== 0) {
        console.log(`Active Bid order - Price Movement: ${ticksMoved} ticks, Current Density Change: ${bidDensityChangePercent2.toFixed(2)}%`);
      }
      if (bidDensityChangePercent2 <= -15) {
        console.log(`Cancelling Bid order - Price Movement: ${ticksMoved} ticks, Density decreased by ${Math.abs(bidDensityChangePercent2).toFixed(2)}%`);
        placeLimitOrder({
          type: "Bid",
          price: store.referenceBidPrice,
          stoploss: 4
        });
        store.referenceBidDensity = 0;
        store.referenceBidPrice = 0;
      }
    }
    if (state.offerLimitOrder) {
      const askDensityChangePercent2 = store.referenceAskDensity === 0 ? 0 : (currentAskDensity - store.referenceAskDensity) / store.referenceAskDensity * 100;
      if (store.referenceAskDensity !== 0) {
        console.log(`Active Ask order - Price Movement: ${ticksMoved} ticks, Current Density Change: ${askDensityChangePercent2.toFixed(2)}%`);
      }
      if (askDensityChangePercent2 <= -15) {
        console.log(`Cancelling Ask order - Price Movement: ${ticksMoved} ticks, Density decreased by ${Math.abs(askDensityChangePercent2).toFixed(2)}%`);
        placeLimitOrder({
          type: "Ask",
          price: store.referenceAskPrice,
          stoploss: 4
        });
        store.referenceAskDensity = 0;
        store.referenceAskPrice = 0;
      }
    }
  }
  store.lastPrice = currentBidPrice;
  store.lastAskDensity = currentAskDensity;
  store.lastBidDensity = currentBidDensity;
})();
