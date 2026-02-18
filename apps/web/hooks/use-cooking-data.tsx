'use client'

import { useToast } from '@/hooks/use-toast'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api/client'
import type {
    CreateMealCompletionInput,
    DayOfWeek,
    FridgeScan,
    MealCompletion,
    MealPlan,
    MealPlanMode,
    Recipe,
    RecipeWithIngredients,
    ShoppingList,
    TraderJoesRecipe,
} from '@/lib/types/cooking.types'
import { startOfWeek } from 'date-fns'
import type { ReactNode } from 'react'
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

interface CookingContextValue {
  recipes: Recipe[]
  tjRecipes: TraderJoesRecipe[]
  recipesLoading: boolean
  tjRecipesLoading: boolean
  refreshRecipes: () => Promise<void>
  refreshTjRecipes: () => Promise<void>

  currentWeek: Date
  setCurrentWeek: (date: Date) => void
  mealPlan: MealPlan | null
  mealPlanLoading: boolean
  updateMealSlot: (
    day: DayOfWeek,
    mealType: string,
    recipeId: string | null
  ) => Promise<void>
  refreshMealPlan: () => Promise<void>

  shoppingList: ShoppingList | null
  shoppingListLoading: boolean
  refreshShoppingList: (regenerate?: boolean) => Promise<void>

  getRecipeById: (id: string) => Recipe | undefined
  getRecipeName: (id: string) => string

  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  selectedRecipeId: string | null
  setSelectedRecipeId: (id: string | null) => void
  selectedTjRecipe: TraderJoesRecipe | null
  setSelectedTjRecipe: (recipe: TraderJoesRecipe | null) => void
  showEditor: boolean
  setShowEditor: (show: boolean) => void
  editingRecipe: RecipeWithIngredients | null
  setEditingRecipe: (recipe: RecipeWithIngredients | null) => void
  showCookingMode: boolean
  setShowCookingMode: (show: boolean) => void
  cookingRecipe: RecipeWithIngredients | null
  setCookingRecipe: (recipe: RecipeWithIngredients | null) => void

  fridgeIngredients: string[]
  setFridgeIngredients: (items: string[]) => void
  fridgeFilterActive: boolean
  setFridgeFilterActive: (active: boolean) => void
  latestScan: FridgeScan | null
  addFridgeItem: (item: string) => Promise<void>
  removeFridgeItem: (item: string) => Promise<void>
  clearFridge: () => Promise<void>
  saveFridgeItems: (items: string[]) => Promise<void>

  mealPlanMode: MealPlanMode
  setMealPlanMode: (mode: MealPlanMode) => void
  skipDay: (day: DayOfWeek, note?: string) => Promise<void>
  unskipDay: (day: DayOfWeek) => Promise<void>
  randomFillDinner: (day: DayOfWeek) => Promise<void>

  completions: MealCompletion[]
  completionsForMealPlan: MealCompletion[]
  createCompletion: (input: CreateMealCompletionInput) => Promise<MealCompletion | null>
  updateCompletionRating: (id: string, rating: number) => Promise<void>
  deleteCompletion: (id: string) => Promise<void>
  getCompletionsForRecipe: (recipeId: string) => MealCompletion[]
  isSlotCompleted: (day: DayOfWeek, mealType: string) => MealCompletion | undefined
}

const CookingContext = createContext<CookingContextValue | null>(null)

export function CookingProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [tjRecipes, setTjRecipes] = useState<TraderJoesRecipe[]>([])
  const [recipesLoading, setRecipesLoading] = useState(true)
  const [tjRecipesLoading, setTjRecipesLoading] = useState(true)

  const [currentWeek, setCurrentWeek] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [mealPlanLoading, setMealPlanLoading] = useState(true)

  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null)
  const [shoppingListLoading, setShoppingListLoading] = useState(false)
  const [mealPlanVersion, setMealPlanVersion] = useState(0)

  const [sidebarOpen, setSidebarOpenState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cookingSidebarOpen')
      return stored !== null ? stored === 'true' : true
    }
    return true
  })

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open)
    if (typeof window !== 'undefined') {
      localStorage.setItem('cookingSidebarOpen', String(open))
    }
  }, [])

  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [selectedTjRecipe, setSelectedTjRecipe] =
    useState<TraderJoesRecipe | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editingRecipe, setEditingRecipe] =
    useState<RecipeWithIngredients | null>(null)
  const [showCookingMode, setShowCookingMode] = useState(false)
  const [cookingRecipe, setCookingRecipe] =
    useState<RecipeWithIngredients | null>(null)

  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>([])
  const [fridgeFilterActive, setFridgeFilterActive] = useState(false)
  const [latestScan, setLatestScan] = useState<FridgeScan | null>(null)

  const [completions, setCompletions] = useState<MealCompletion[]>([])

  const [mealPlanMode, setMealPlanModeState] = useState<MealPlanMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mealPlanMode') as MealPlanMode) || 'dinner-only'
    }
    return 'dinner-only'
  })

  const setMealPlanMode = useCallback((mode: MealPlanMode) => {
    setMealPlanModeState(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('mealPlanMode', mode)
    }
  }, [])

  const refreshRecipes = useCallback(async () => {
    setRecipesLoading(true)
    try {
      const response = await apiGet<Recipe[]>('/api/cooking/recipes')
      if (response.success && response.data) {
        setRecipes(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
    } finally {
      setRecipesLoading(false)
    }
  }, [])

  const refreshTjRecipes = useCallback(async () => {
    setTjRecipesLoading(true)
    try {
      const response = await apiGet<TraderJoesRecipe[]>(
        '/api/cooking/trader-joes/search'
      )
      if (response.success && response.data) {
        setTjRecipes(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch TJ recipes:', error)
    } finally {
      setTjRecipesLoading(false)
    }
  }, [])

  const refreshMealPlan = useCallback(async () => {
    setMealPlanLoading(true)
    try {
      const response = await apiGet<MealPlan>(
        `/api/cooking/meal-plans?week_start=${currentWeek.toISOString()}`
      )
      if (response.success && response.data) {
        setMealPlan(response.data)
      } else {
        setMealPlan(null)
      }
    } catch (error) {
      console.error('Failed to fetch meal plan:', error)
    } finally {
      setMealPlanLoading(false)
    }
  }, [currentWeek])

  const refreshShoppingList = useCallback(async (regenerate?: boolean) => {
    if (!mealPlan?.id) {
      setShoppingList(null)
      return
    }
    setShoppingListLoading(true)
    try {
      const url = `/api/cooking/meal-plans/${mealPlan.id}/shopping-list${regenerate ? '?regenerate=true' : ''}`
      const response = await apiGet<ShoppingList>(url)
      if (response.success && response.data) {
        setShoppingList(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch shopping list:', error)
    } finally {
      setShoppingListLoading(false)
    }
  }, [mealPlan?.id])

  const updateMealSlot = useCallback(
    async (day: DayOfWeek, mealType: string, recipeId: string | null) => {
      if (!mealPlan) {
        try {
          const response = await apiPost<MealPlan>('/api/cooking/meal-plans', {
            week_start_date: currentWeek.toISOString(),
            meals: { [day]: { [mealType]: recipeId || undefined } },
          })
          if (response.success && response.data) {
            setMealPlan(response.data)
            setMealPlanVersion((v) => v + 1)
            toast({ title: 'Meal plan created' })
          }
        } catch {
          toast({
            title: 'Error',
            description: 'Failed to save meal plan',
            variant: 'destructive',
          })
        }
      } else {
        const updatedMeals = {
          ...mealPlan.meals,
          [day]: {
            ...mealPlan.meals[day],
            [mealType]: recipeId || undefined,
          },
        }
        try {
          const response = await apiPut<MealPlan>(
            `/api/cooking/meal-plans/${mealPlan.id}`,
            { meals: updatedMeals }
          )
          if (response.success && response.data) {
            setMealPlan(response.data)
            setMealPlanVersion((v) => v + 1)
          }
        } catch {
          toast({
            title: 'Error',
            description: 'Failed to update meal plan',
            variant: 'destructive',
          })
        }
      }
    },
    [mealPlan, currentWeek, toast]
  )

  useEffect(() => {
    refreshRecipes()
    refreshTjRecipes()
  }, [refreshRecipes, refreshTjRecipes])

  // Load latest fridge scan on mount
  useEffect(() => {
    async function loadLatestScan() {
      try {
        const response = await apiGet<FridgeScan>('/api/cooking/fridge-scan?latest=true')
        if (response.success && response.data) {
          const scan = response.data
          // Only use scans from the last 7 days
          const scanDate = new Date(scan.created_at)
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          if (scanDate >= sevenDaysAgo) {
            setLatestScan(scan)
            const items = scan.confirmed_items.length > 0 ? scan.confirmed_items : scan.identified_items
            if (items.length > 0) {
              setFridgeIngredients(items)
            }
          }
        }
      } catch {
        // Silently fail — scan history is non-critical
      }
    }
    loadLatestScan()
  }, [])

  const saveFridgeItems = useCallback(async (items: string[]) => {
    try {
      if (latestScan) {
        const response = await apiPut<FridgeScan>(
          `/api/cooking/fridge-scan/${latestScan.id}`,
          { confirmed_items: items, recipes_matched: 0 }
        )
        if (response.success && response.data) {
          setLatestScan(response.data)
        }
      } else {
        const response = await apiPost<FridgeScan>(
          '/api/cooking/fridge-scan',
          { type: 'manual', items }
        )
        if (response.success && response.data) {
          setLatestScan(response.data)
        }
      }
    } catch (error) {
      console.error('Failed to persist fridge items:', error)
    }
  }, [latestScan])

  const addFridgeItem = useCallback(async (item: string) => {
    const normalized = item.trim().toLowerCase()
    if (!normalized) return
    const updated = [...new Set([...fridgeIngredients, normalized])]
    setFridgeIngredients(updated)
    await saveFridgeItems(updated)
  }, [fridgeIngredients, saveFridgeItems])

  const removeFridgeItem = useCallback(async (item: string) => {
    const updated = fridgeIngredients.filter((i) => i !== item)
    setFridgeIngredients(updated)
    if (updated.length === 0) {
      setFridgeFilterActive(false)
    }
    await saveFridgeItems(updated)
  }, [fridgeIngredients, saveFridgeItems])

  const clearFridge = useCallback(async () => {
    setFridgeIngredients([])
    setFridgeFilterActive(false)
    await saveFridgeItems([])
  }, [saveFridgeItems])

  const skipDay = useCallback(async (day: DayOfWeek, note?: string) => {
    const skipData = {
      skipped: true,
      skip_note: note || undefined,
      dinner: undefined,
      breakfast: undefined,
      lunch: undefined,
      snack: undefined,
    }
    try {
      if (!mealPlan) {
        const response = await apiPost<MealPlan>('/api/cooking/meal-plans', {
          week_start_date: currentWeek.toISOString(),
          meals: { [day]: skipData },
        })
        if (response.success && response.data) {
          setMealPlan(response.data)
          setMealPlanVersion((v) => v + 1)
        }
      } else {
        const updatedMeals = {
          ...mealPlan.meals,
          [day]: skipData,
        }
        const response = await apiPut<MealPlan>(
          `/api/cooking/meal-plans/${mealPlan.id}`,
          { meals: updatedMeals }
        )
        if (response.success && response.data) {
          setMealPlan(response.data)
          setMealPlanVersion((v) => v + 1)
        }
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to skip day',
        variant: 'destructive',
      })
    }
  }, [mealPlan, currentWeek, toast])

  const unskipDay = useCallback(async (day: DayOfWeek) => {
    if (!mealPlan) return
    const dayMeals = { ...(mealPlan.meals[day] || {}) }
    delete dayMeals.skipped
    delete dayMeals.skip_note
    const updatedMeals = {
      ...mealPlan.meals,
      [day]: Object.keys(dayMeals).length > 0 ? dayMeals : undefined,
    }
    try {
      const response = await apiPut<MealPlan>(
        `/api/cooking/meal-plans/${mealPlan.id}`,
        { meals: updatedMeals }
      )
      if (response.success && response.data) {
        setMealPlan(response.data)
        setMealPlanVersion((v) => v + 1)
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to unskip day',
        variant: 'destructive',
      })
    }
  }, [mealPlan, toast])

  const randomFillDinner = useCallback(async (day: DayOfWeek) => {
    if (recipes.length === 0) {
      toast({ title: 'No recipes available', variant: 'destructive' })
      return
    }

    try {
      const recentRes = await apiGet<MealPlan[]>('/api/cooking/meal-plans?recent_weeks=3')
      const recentPlans = recentRes.success && recentRes.data ? recentRes.data : []

      const recentRecipeIds = new Set<string>()
      for (const plan of recentPlans) {
        const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for (const d of days) {
          const dayMeals = plan.meals[d]
          if (dayMeals) {
            if (dayMeals.dinner) recentRecipeIds.add(dayMeals.dinner)
            if (dayMeals.breakfast) recentRecipeIds.add(dayMeals.breakfast)
            if (dayMeals.lunch) recentRecipeIds.add(dayMeals.lunch)
            if (dayMeals.snack) recentRecipeIds.add(dayMeals.snack)
          }
        }
      }

      let eligible = recipes.filter((r) => !recentRecipeIds.has(r.id))
      if (eligible.length === 0) {
        eligible = [...recipes]
        toast({ title: 'All recipes used recently — picking from full list' })
      }

      const randomRecipe = eligible[Math.floor(Math.random() * eligible.length)]
      if (!randomRecipe) throw new Error('No eligible recipes')
      await updateMealSlot(day, 'dinner', randomRecipe.id)
      toast({ title: `Set ${randomRecipe.name} for ${day} dinner` })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to randomly fill dinner',
        variant: 'destructive',
      })
    }
  }, [recipes, updateMealSlot, toast])

  const refreshCompletions = useCallback(async () => {
    try {
      const params = mealPlan?.id ? `?meal_plan_id=${mealPlan.id}` : ''
      const response = await apiGet<MealCompletion[]>(`/api/cooking/completions${params}`)
      if (response.success && response.data) {
        setCompletions(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch completions:', error)
    }
  }, [mealPlan?.id])

  const createCompletion = useCallback(async (input: CreateMealCompletionInput): Promise<MealCompletion | null> => {
    try {
      const response = await apiPost<MealCompletion>('/api/cooking/completions', input)
      if (response.success && response.data) {
        setCompletions((prev) => [response.data!, ...prev])
        toast({ title: 'Meal marked as cooked' })
        return response.data
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to log completion', variant: 'destructive' })
    }
    return null
  }, [toast])

  const updateCompletionRating = useCallback(async (id: string, rating: number) => {
    try {
      const response = await apiPut<MealCompletion>(`/api/cooking/completions/${id}`, { rating })
      if (response.success && response.data) {
        setCompletions((prev) => prev.map((c) => (c.id === id ? response.data! : c)))
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update rating', variant: 'destructive' })
    }
  }, [toast])

  const deleteCompletion = useCallback(async (id: string) => {
    try {
      const response = await apiDelete(`/api/cooking/completions/${id}`)
      if (response.success) {
        setCompletions((prev) => prev.filter((c) => c.id !== id))
        toast({ title: 'Completion removed' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove completion', variant: 'destructive' })
    }
  }, [toast])

  const getCompletionsForRecipe = useCallback(
    (recipeId: string) => completions.filter((c) => c.recipe_id === recipeId),
    [completions]
  )

  const isSlotCompleted = useCallback(
    (day: DayOfWeek, mealType: string) =>
      completions.find(
        (c) => c.meal_plan_id === mealPlan?.id && c.day_of_week === day && c.meal_type === mealType
      ),
    [completions, mealPlan?.id]
  )

  const completionsForMealPlan = useMemo(
    () => completions.filter((c) => c.meal_plan_id === mealPlan?.id),
    [completions, mealPlan?.id]
  )

  useEffect(() => {
    refreshMealPlan()
  }, [refreshMealPlan])

  // Auto-regenerate shopping list when meal plan mutates
  useEffect(() => {
    if (mealPlanVersion > 0) {
      refreshShoppingList(true)
    }
  }, [mealPlanVersion, refreshShoppingList])

  // Refresh completions when meal plan changes
  useEffect(() => {
    if (mealPlan?.id) {
      refreshCompletions()
    }
  }, [mealPlan?.id, refreshCompletions])

  const getRecipeById = useCallback(
    (id: string) => recipes.find((r) => r.id === id),
    [recipes]
  )

  const getRecipeName = useCallback(
    (id: string) => recipes.find((r) => r.id === id)?.name || '',
    [recipes]
  )

  const value = useMemo(
    () => ({
      recipes,
      tjRecipes,
      recipesLoading,
      tjRecipesLoading,
      refreshRecipes,
      refreshTjRecipes,
      currentWeek,
      setCurrentWeek,
      mealPlan,
      mealPlanLoading,
      updateMealSlot,
      refreshMealPlan,
      shoppingList,
      shoppingListLoading,
      refreshShoppingList,
      getRecipeById,
      getRecipeName,
      sidebarOpen,
      setSidebarOpen,
      selectedRecipeId,
      setSelectedRecipeId,
      selectedTjRecipe,
      setSelectedTjRecipe,
      showEditor,
      setShowEditor,
      editingRecipe,
      setEditingRecipe,
      showCookingMode,
      setShowCookingMode,
      cookingRecipe,
      setCookingRecipe,
      fridgeIngredients,
      setFridgeIngredients,
      fridgeFilterActive,
      setFridgeFilterActive,
      latestScan,
      addFridgeItem,
      removeFridgeItem,
      clearFridge,
      saveFridgeItems,
      mealPlanMode,
      setMealPlanMode,
      skipDay,
      unskipDay,
      randomFillDinner,
      completions,
      completionsForMealPlan,
      createCompletion,
      updateCompletionRating,
      deleteCompletion,
      getCompletionsForRecipe,
      isSlotCompleted,
    }),
    [
      recipes,
      tjRecipes,
      recipesLoading,
      tjRecipesLoading,
      refreshRecipes,
      refreshTjRecipes,
      currentWeek,
      mealPlan,
      mealPlanLoading,
      updateMealSlot,
      refreshMealPlan,
      shoppingList,
      shoppingListLoading,
      refreshShoppingList,
      getRecipeById,
      getRecipeName,
      sidebarOpen,
      setSidebarOpen,
      selectedRecipeId,
      selectedTjRecipe,
      showEditor,
      editingRecipe,
      showCookingMode,
      cookingRecipe,
      fridgeIngredients,
      fridgeFilterActive,
      latestScan,
      addFridgeItem,
      removeFridgeItem,
      clearFridge,
      saveFridgeItems,
      mealPlanMode,
      setMealPlanMode,
      skipDay,
      unskipDay,
      randomFillDinner,
      completions,
      completionsForMealPlan,
      createCompletion,
      updateCompletionRating,
      deleteCompletion,
      getCompletionsForRecipe,
      isSlotCompleted,
    ]
  )

  return (
    <CookingContext.Provider value={value}>{children}</CookingContext.Provider>
  )
}

export function useCooking() {
  const context = useContext(CookingContext)
  if (!context) {
    throw new Error('useCooking must be used within a CookingProvider')
  }
  return context
}
