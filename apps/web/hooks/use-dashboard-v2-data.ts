'use client'

import { useConnectivity } from '@/components/connectivity-provider'
import { apiDelete, apiGet, apiPost } from '@/lib/api/client'
import type { CalendarEvent } from '@/lib/types/calendar.types'
import type {
  MealPlan,
  Recipe,
  ShoppingList,
} from '@/lib/types/cooking.types'
import type {
  ConsistencyStats,
  DayOfWeek,
  WeeklyRoutine,
  Workout,
} from '@/lib/types/fitness.types'
import type {
  WeatherForecast,
  WeatherObservation,
} from '@/lib/types/weather.types'
import { format, startOfWeek } from 'date-fns'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface DashboardV2Data {
  routine: WeeklyRoutine | null
  workout: Workout | null
  consistencyStats: ConsistencyStats | null
  mealPlan: MealPlan | null
  recipes: Recipe[]
  shoppingList: ShoppingList | null
  calendarEvents: CalendarEvent[]
  weather: WeatherObservation | null
  forecast: WeatherForecast | null
  spotifyTrack: SpotifyPlayback | null
}

export interface SpotifyPlayback {
  track: {
    name: string
    artist: string
    album: string
    imageUrl: string
    durationMs: number
    progressMs: number
  } | null
  isPlaying: boolean
  source?: string
}

export interface DashboardV2State extends DashboardV2Data {
  loading: boolean
  errors: Partial<Record<keyof DashboardV2Data, string>>
  selectedDate: Date
  navDirection: 'forward' | 'backward' | null
  isRestDay: boolean
  dayOfWeek: DayOfWeek
  weekNumber: number
  focusType: string

  navigateToDay: (date: Date, direction: 'forward' | 'backward') => void
  goToToday: () => void
  completeRoutine: (type: 'morning' | 'night') => Promise<void>
  uncompleteRoutine: (type: 'morning' | 'night') => Promise<void>
  refetch: () => void
}

function getDayOfWeek(date: Date): DayOfWeek {
  return format(date, 'EEEE').toLowerCase() as DayOfWeek
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  )
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

function getInitialDate(): Date {
  if (typeof window === 'undefined') return new Date()
  const params = new URLSearchParams(window.location.search)
  const dayParam = params.get('day')
  if (dayParam) {
    const parsed = new Date(dayParam + 'T00:00:00')
    if (!isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

export function useDashboardV2Data(): DashboardV2State {
  const { isInitialized } = useConnectivity()
  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate)
  const [navDirection, setNavDirection] = useState<
    'forward' | 'backward' | null
  >(null)

  const [data, setData] = useState<DashboardV2Data>({
    routine: null,
    workout: null,
    consistencyStats: null,
    mealPlan: null,
    recipes: [],
    shoppingList: null,
    calendarEvents: [],
    weather: null,
    forecast: null,
    spotifyTrack: null,
  })
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<
    Partial<Record<keyof DashboardV2Data, string>>
  >({})

  const workoutCacheRef = useRef<Map<string, Workout>>(new Map())
  const fetchIdRef = useRef(0)

  const dayOfWeek = getDayOfWeek(selectedDate)
  const weekNumber = getWeekNumber(selectedDate)

  const focusType =
    data.routine?.schedule[dayOfWeek]?.focus || 'Rest'
  const isRestDay =
    focusType === 'Rest' || focusType === 'Active Recovery'

  const fetchAllData = useCallback(
    async (date: Date, isInitialLoad = false) => {
      const fetchId = ++fetchIdRef.current
      if (isInitialLoad) setLoading(true)

      const day = getDayOfWeek(date)
      const week = getWeekNumber(date)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')
      const newErrors: Partial<Record<keyof DashboardV2Data, string>> = {}

      const cachedWorkout = workoutCacheRef.current.get(day)

      const [
        routineRes,
        workoutRes,
        consistencyRes,
        mealPlanRes,
        recipesRes,
        calendarRes,
        weatherRes,
        forecastRes,
      ] = await Promise.all([
        apiGet<WeeklyRoutine>('/api/fitness/routine').catch(() => null),
        cachedWorkout
          ? Promise.resolve({ success: true, data: cachedWorkout })
          : apiGet<Workout>(`/api/fitness/workout/${day}`).catch(() => null),
        apiGet<ConsistencyStats>('/api/fitness/consistency').catch(() => null),
        apiGet<MealPlan>(
          `/api/cooking/meal-plans?week_start=${weekStartStr}`
        ).catch(() => null),
        apiGet<Recipe[]>('/api/cooking/recipes').catch(() => null),
        apiGet<{ events: CalendarEvent[] }>(
          '/api/calendar/upcoming?maxResults=10'
        ).catch(() => null),
        apiGet<WeatherObservation>('/api/weather/current').catch(() => null),
        apiGet<WeatherForecast>('/api/weather/forecast').catch(() => null),
      ])

      if (fetchId !== fetchIdRef.current) return

      const workout =
        workoutRes?.success && workoutRes.data ? workoutRes.data : null
      if (workout) workoutCacheRef.current.set(day, workout)
      if (!workoutRes?.success) newErrors.workout = 'Failed to load workout'

      const routine =
        routineRes?.success && routineRes.data ? routineRes.data : null
      if (!routineRes?.success) newErrors.routine = 'Failed to load routine'

      const consistencyStats =
        consistencyRes?.success && consistencyRes.data
          ? consistencyRes.data
          : null

      const mealPlan =
        mealPlanRes?.success && mealPlanRes.data ? mealPlanRes.data : null
      if (!mealPlanRes?.success)
        newErrors.mealPlan = 'Failed to load meal plan'

      const recipes =
        recipesRes?.success && recipesRes.data ? recipesRes.data : []

      const calendarEvents =
        calendarRes?.success && calendarRes.data?.events
          ? calendarRes.data.events
          : []
      if (!calendarRes?.success)
        newErrors.calendarEvents = 'Failed to load calendar'

      const weather =
        weatherRes?.success && weatherRes.data ? weatherRes.data : null
      const forecast =
        forecastRes?.success && forecastRes.data ? forecastRes.data : null

      let shoppingList: ShoppingList | null = null
      if (mealPlan) {
        try {
          const shopRes = await apiGet<ShoppingList>(
            `/api/cooking/meal-plans/${mealPlan.id}/shopping-list`
          )
          if (shopRes.success && shopRes.data) shoppingList = shopRes.data
        } catch {
          /* shopping list may not exist */
        }
      }

      if (fetchId !== fetchIdRef.current) return

      setData(prev => ({
        ...prev,
        routine,
        workout,
        consistencyStats,
        mealPlan,
        recipes,
        shoppingList,
        calendarEvents,
        weather,
        forecast,
      }))
      setErrors(newErrors)
      setLoading(false)
    },
    []
  )

  useEffect(() => {
    if (!isInitialized) return
    fetchAllData(selectedDate, true)
  }, [isInitialized, fetchAllData, selectedDate])

  // Poll calendar events every 5 minutes
  useEffect(() => {
    if (!isInitialized) return
    const interval = setInterval(async () => {
      const res = await apiGet<{ events: CalendarEvent[] }>(
        '/api/calendar/upcoming?maxResults=10'
      ).catch(() => null)
      if (res?.success && res.data?.events) {
        setData(prev => ({ ...prev, calendarEvents: res.data!.events }))
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [isInitialized])

  // Poll spotify every 15 seconds
  useEffect(() => {
    if (!isInitialized) return
    const fetchSpotify = async () => {
      const res = await apiGet<SpotifyPlayback>('/api/spotify/player').catch(
        () => null
      )
      if (res?.success && res.data) {
        setData(prev => ({ ...prev, spotifyTrack: res.data! }))
      }
    }
    fetchSpotify()
    const interval = setInterval(fetchSpotify, 15_000)
    return () => clearInterval(interval)
  }, [isInitialized])

  const navigateToDay = useCallback(
    (date: Date, direction: 'forward' | 'backward') => {
      setNavDirection(direction)
      setSelectedDate(date)
      const dateStr = format(date, 'yyyy-MM-dd')
      window.history.replaceState(null, '', `/v2?day=${dateStr}`)
    },
    []
  )

  const goToToday = useCallback(() => {
    const today = new Date()
    const direction = selectedDate > today ? 'backward' : 'forward'
    navigateToDay(today, direction)
  }, [selectedDate, navigateToDay])

  const completeRoutine = useCallback(
    async (type: 'morning' | 'night') => {
      const day = getDayOfWeek(selectedDate)
      const week = getWeekNumber(selectedDate)

      // Optimistic update
      setData(prev => {
        if (!prev.routine) return prev
        const routine = { ...prev.routine }
        const weekData = routine.weeks.find(w => w.weekNumber === week)
        if (!weekData) return prev
        const dayData = weekData.days[day]
        if (!dayData) return prev
        const key =
          type === 'morning' ? 'morningRoutine' : 'nightRoutine'
        if (dayData[key]) {
          dayData[key] = {
            ...dayData[key]!,
            completed: true,
            completedAt: new Date().toISOString(),
          }
        }
        return { ...prev, routine }
      })

      try {
        const res = await apiPost(
          `/api/fitness/routine/${type}/complete?day=${day}&week=${week}`
        )
        if (!res.success) throw new Error(res.error)
      } catch {
        // Revert on failure
        setData(prev => {
          if (!prev.routine) return prev
          const routine = { ...prev.routine }
          const weekData = routine.weeks.find(w => w.weekNumber === week)
          if (!weekData) return prev
          const dayData = weekData.days[day]
          if (!dayData) return prev
          const key =
            type === 'morning' ? 'morningRoutine' : 'nightRoutine'
          if (dayData[key]) {
            dayData[key] = {
              ...dayData[key]!,
              completed: false,
              completedAt: undefined,
            }
          }
          return { ...prev, routine }
        })
      }
    },
    [selectedDate]
  )

  const uncompleteRoutine = useCallback(
    async (type: 'morning' | 'night') => {
      const day = getDayOfWeek(selectedDate)
      const week = getWeekNumber(selectedDate)

      setData(prev => {
        if (!prev.routine) return prev
        const routine = { ...prev.routine }
        const weekData = routine.weeks.find(w => w.weekNumber === week)
        if (!weekData) return prev
        const dayData = weekData.days[day]
        if (!dayData) return prev
        const key =
          type === 'morning' ? 'morningRoutine' : 'nightRoutine'
        if (dayData[key]) {
          dayData[key] = {
            ...dayData[key]!,
            completed: false,
            completedAt: undefined,
          }
        }
        return { ...prev, routine }
      })

      try {
        const res = await apiDelete(
          `/api/fitness/routine/${type}/complete?day=${day}&week=${week}`
        )
        if (!res.success) throw new Error(res.error)
      } catch {
        fetchAllData(selectedDate)
      }
    },
    [selectedDate, fetchAllData]
  )

  const refetch = useCallback(() => {
    fetchAllData(selectedDate, true)
  }, [selectedDate, fetchAllData])

  return {
    ...data,
    loading,
    errors,
    selectedDate,
    navDirection,
    isRestDay,
    dayOfWeek,
    weekNumber,
    focusType,
    navigateToDay,
    goToToday,
    completeRoutine,
    uncompleteRoutine,
    refetch,
  }
}
