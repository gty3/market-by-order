// @ts-check
/// <reference path="../../types.d.ts" />

import { Instrument } from "../../types";

/**
 * Tracks price movements and density changes over a specified time window
 * Used to identify potential trading opportunities based on price action and liquidity
 */

export class PriceMovementTracker {
  priceHistory: { timestamp: number; price: number }[] = []
  bidDensityHistory: { timestamp: number; density: number }[] = []
  askDensityHistory: { timestamp: number; density: number }[] = []
  tickSize: number
  timeWindowSeconds = 8

  constructor(instrument: Instrument, timeWindowSeconds = 8) {
    this.tickSize = instrument.increment
    this.timeWindowSeconds = timeWindowSeconds
  }

  update(currentPrice: number, currentBidDensity: number, currentAskDensity: number) {
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

  cleanupOldEntries(currentTime: number) {
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