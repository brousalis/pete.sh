/**
 * TypeScript types for CTA Transit integration
 */

export interface CTABusPrediction {
  tmstmp: string
  typ: string
  stpnm: string
  stpid: string
  vid: string
  dstp: number
  rt: string
  rtdd: string
  rtdir: string
  des: string
  prdtm: string
  prdctdn: string
  dly: boolean
  tablockid: string
  tatripid: string
  zone: string
}

export interface CTABusResponse {
  "bustime-response": {
    prd?: CTABusPrediction[]
    error?: Array<{
      rt: string
      msg: string
    }>
  }
}

export interface CTATrainPrediction {
  tmstmp: string
  errCd: string
  errNm: string | null
  eta: Array<{
    staId: string
    stpId: string
    staNm: string
    stpDe: string
    rn: string
    rt: string
    destSt: number
    destNm: string
    trDr: number | string
    prdt: string
    arrT: string
    isApp: string
    isSch: string
    isDly: string
    isFlt: string
    flags: string | null
    lat: string
    lon: string
    heading: string
  }>
}

export interface CTATrainResponse {
  "ctatt": {
    tmst: string
    errCd: string
    errNm: string | null
    eta: CTATrainPrediction["eta"]
  }
}

export interface CTARoute {
  route: string
  name: string
  type: "bus" | "train"
  direction?: string
  stopId?: string
}

export interface CTABusStop {
  stpid: string
  stpnm: string
  lat: string
  lon: string
}

export interface CTABusStopsResponse {
  "bustime-response": {
    stops?: CTABusStop[]
    error?: Array<{
      rt: string
      msg: string
    }>
  }
}

export interface CTARouteConfig {
  bus: {
    route: string
    stopId: string
    direction: string
  }[]
  train: {
    line: string
    stationId: string
    direction: string
  }[]
}

/**
 * Walking times to various CTA stops (in minutes)
 */
export const WALKING_TIMES = {
  bus: {
    "76": 3,    // 76 bus stop - 3 minutes walk
    "22": 5,    // 22 bus stop - 5 minutes walk
    "36": 5,    // 36 bus stop - 5 minutes walk
  },
  train: {
    "Brn": 12,  // Brown Line station - 12 minutes walk
    "P": 12,    // Purple Line station - 12 minutes walk
  },
} as const

/**
 * Get walking time for a route
 */
export function getWalkingTime(route: string, type: "bus" | "train"): number {
  if (type === "bus") {
    return WALKING_TIMES.bus[route as keyof typeof WALKING_TIMES.bus] ?? 5
  }
  return WALKING_TIMES.train[route as keyof typeof WALKING_TIMES.train] ?? 12
}

/**
 * Urgency level based on time remaining vs walking time
 */
export type UrgencyLevel = "missed" | "leave-now" | "prepare" | "upcoming" | "normal"

/**
 * Calculate urgency level based on arrival time and walking time
 * @param arrivalMinutes - Minutes until arrival
 * @param walkingMinutes - Minutes to walk to the stop
 * @returns Urgency level
 * 
 * Logic:
 * - buffer < 0: MISSED - impossible to catch, arrival is sooner than walk time
 * - buffer 0-1: LEAVE NOW - must leave immediately to catch it
 * - buffer 2-3: PREPARE - get ready to leave in the next minute or two
 * - buffer 4-6: UPCOMING - be aware, leaving soon
 * - buffer > 6: NORMAL - plenty of time
 */
export function getUrgencyLevel(arrivalMinutes: number, walkingMinutes: number): UrgencyLevel {
  const buffer = arrivalMinutes - walkingMinutes
  
  if (buffer < 0) {
    // Too late - can't make it even if you leave now
    return "missed"
  } else if (buffer <= 1) {
    // 0-1 minute buffer - must leave RIGHT NOW to catch it
    return "leave-now"
  } else if (buffer <= 3) {
    // 2-3 minute buffer - get ready to leave
    return "prepare"
  } else if (buffer <= 6) {
    // 4-6 minute buffer - upcoming, be aware
    return "upcoming"
  }
  return "normal"
}
