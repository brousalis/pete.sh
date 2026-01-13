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
