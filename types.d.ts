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
      attributes: {}
    }
  }
}

export {}
