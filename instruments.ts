const instruments: {
  [key: string]: {
    increment: number
    minPrice: number
    commission: number
    fraction?: number
    name: string
    industry: string
  }
} = {
  CL: {
    increment: 10000000,
    minPrice: 100000,
    commission: 20200,
    name: "Crude Oil",
    industry: "Energy",
  },
  ZW: {
    increment: 250000000,
    minPrice: 125000,
    commission: 26200,
    name: "Chicago SRW Wheat",
    industry: "Agriculture",
  },
  NQ: {
    increment: 250000000,
    minPrice: 50000,
    commission: 19000,
    name: "E-mini Nasdaq-100",
    industry: "Indices",
  },
  GC: {
    increment: 100000000,
    minPrice: 100000,
    commission: 21200,
    name: "Gold",
    industry: "Metals",
  },
  ZB: {
    increment: 31250000,
    minPrice: 312500,
    commission: 13900,
    fraction: 32,
    name: "30-Year U.S. Treasury Bond",
    industry: "Fixed Income",
  },
  ES: {
    increment: 250000000,
    minPrice: 125000,
    commission: 19000,
    name: "E-mini S&P 500",
    industry: "Indices",
  },
  MES: {
    increment: 250000000,
    minPrice: 12500,
    commission: 5000,
    name: "Micro E-mini S&P 500",
    industry: "Indices",
  },
  ZN: {
    increment: 15625000,
    minPrice: 156250,
    commission: 13200,
    fraction: 64,
    name: "10-Year U.S. Treasury Note",
    industry: "Fixed Income",
  },
  UB: {
    increment: 31250000,
    minPrice: 312500,
    commission: 14700,
    fraction: 32,
    name: "Ultra U.S. Treasury Bond",
    industry: "Fixed Income",
  },
  TN: {
    increment: 15625000,
    minPrice: 156250,
    commission: 13200,
    fraction: 64,
    name: "Ultra 10-Year U.S. Treasury Note",
    industry: "Fixed Income",
  },
  "6E": {
    increment: 50000,
    minPrice: 62500,
    commission: 21200,
    name: "Euro FX",
    industry: "Forex",
  },
  "6J": {
    increment: 500,
    minPrice: 62500,
    commission: 21200,
    name: "Japanese Yen",
    industry: "Forex",
  },
  NKD: {
    increment: 5000000000,
    minPrice: 250000,
    commission: 26700,
    name: "Nikkei 225",
    industry: "Indices",
  },
  NIY: {
    increment: 5000000000,
    minPrice: 163000,
    commission: 26700,
    name: "Nikkei 225 Yen",
    industry: "Indices",
  },
  BTC: {
    increment: 5000000000,
    minPrice: 250000,
    commission: 72600,
    name: "Bitcoin",
    industry: "Cryptocurrency",
  },
}

export default instruments
