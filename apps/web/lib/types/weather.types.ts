/**
 * TypeScript types for Weather.gov integration
 */

export interface WeatherPoint {
  id: string
  type: string
  geometry: {
    type: string
    coordinates: [number, number]
  }
  properties: {
    "@id": string
    "@type": string
    cwa: string
    forecastOffice: string
    gridId: string
    gridX: number
    gridY: number
    forecast: string
    forecastHourly: string
    forecastGridData: string
    observationStations: string
    relativeLocation: {
      type: string
      geometry: {
        type: string
        coordinates: [number, number]
      }
      properties: {
        city: string
        state: string
        distance: {
          value: number
          unitCode: string
        }
        bearing: {
          value: number
          unitCode: string
        }
      }
    }
    forecastZone: string
    county: string
    fireWeatherZone: string
    timeZone: string
    radarStation: string
  }
}

export interface WeatherForecast {
  "@context": Array<Record<string, unknown> | string>
  type: string
  geometry: {
    type: string
    coordinates: Array<Array<Array<[number, number]>>>
  }
  properties: {
    updated: string
    units: string
    forecastGenerator: string
    generatedAt: string
    updateTime: string
    validTimes: string
    elevation: {
      value: number
      unitCode: string
    }
    periods: WeatherPeriod[]
  }
}

export interface WeatherPeriod {
  number: number
  name: string
  startTime: string
  endTime: string
  isDaytime: boolean
  temperature: number
  temperatureUnit: string
  temperatureTrend: string | null
  probabilityOfPrecipitation: {
    value: number | null
    unitCode: string
  }
  dewpoint: {
    value: number
    unitCode: string
  }
  relativeHumidity: {
    value: number
    unitCode: string
  }
  windSpeed: string
  windDirection: string
  icon: string
  shortForecast: string
  detailedForecast: string
}

export interface WeatherObservation {
  "@context": Array<Record<string, unknown> | string>
  id: string
  type: string
  geometry: {
    type: string
    coordinates: [number, number, number]
  }
  properties: {
    "@id": string
    "@type": string
    elevation: {
      value: number
      unitCode: string
    }
    station: string
    timestamp: string
    rawMessage: string
    textDescription: string
    icon: string
    presentWeather: Array<{
      intensity: string | null
      modifier: string | null
      weather: string | null
      rawString: string
    }>
    temperature: {
      value: number
      unitCode: string
      qualityControl: string
    }
    dewpoint: {
      value: number
      unitCode: string
      qualityControl: string
    }
    windDirection: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    windSpeed: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    windGust: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    barometricPressure: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    seaLevelPressure: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    visibility: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    maxTemperatureLast24Hours: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    minTemperatureLast24Hours: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    precipitationLastHour: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    relativeHumidity: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    heatIndex: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
    windChill: {
      value: number | null
      unitCode: string
      qualityControl: string
    }
  }
}
