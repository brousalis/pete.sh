'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api/client'
import type {
  BrewMethod,
  CoffeeConfig,
  CoffeeRecipe,
  CoffeeRecommendation,
  CupSize,
  GoldenRule,
  QuickDose,
  RoastLevel,
  RoastStrategy,
} from '@/lib/types/coffee.types'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Clock,
  Coffee,
  Droplets,
  Edit2,
  Flame,
  Plus,
  RefreshCw,
  Scale,
  Settings,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type EditorTab = 'recipes' | 'doses' | 'roasts' | 'rules' | 'recommendations'

const METHODS: { value: BrewMethod; label: string }[] = [
  { value: 'switch', label: 'Hario Switch' },
  { value: 'moccamaster', label: 'Moccamaster' },
]

const ROASTS: { value: RoastLevel; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'dark', label: 'Dark' },
]

const CUP_SIZES: { value: CupSize; label: string; methods: BrewMethod[] }[] = [
  { value: '1-cup', label: '1 Cup (300ml)', methods: ['switch'] },
  {
    value: '2-cup',
    label: '2 Cups (600ml)',
    methods: ['switch', 'moccamaster'],
  },
  { value: '3-4-cup', label: '3-4 Cups (1000ml)', methods: ['switch'] },
  { value: '8-cup', label: '8 Cups (1 Liter)', methods: ['moccamaster'] },
  { value: '10-cup', label: '10 Cups (1.25 Liters)', methods: ['moccamaster'] },
]

const DAYS_OF_WEEK = [
  { value: null, label: 'Any Day' },
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export function CoffeeConfigEditor() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<EditorTab>('recipes')
  const [isLoading, setIsLoading] = useState(true)
  const [config, setConfig] = useState<CoffeeConfig | null>(null)

  // Dialog state
  const [editingRecipe, setEditingRecipe] = useState<CoffeeRecipe | null>(null)
  const [editingDose, setEditingDose] = useState<QuickDose | null>(null)
  const [editingRule, setEditingRule] = useState<GoldenRule | null>(null)
  const [editingStrategy, setEditingStrategy] = useState<RoastStrategy | null>(
    null
  )
  const [editingRecommendation, setEditingRecommendation] =
    useState<CoffeeRecommendation | null>(null)
  const [isNewItem, setIsNewItem] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'recipe' | 'dose' | 'rule' | 'recommendation'
    id: string
    name: string
  } | null>(null)

  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await apiGet<CoffeeConfig>('/api/coffee/config')
      if (response.success && response.data) {
        setConfig(response.data)
      } else {
        throw new Error(response.error || 'Failed to load config')
      }
    } catch (error) {
      toast({
        title: 'Error loading config',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // ============================================
  // RECIPE HANDLERS
  // ============================================
  const handleSaveRecipe = async () => {
    if (!editingRecipe) return
    setIsSaving(true)

    try {
      if (isNewItem) {
        const response = await apiPost<CoffeeRecipe>(
          '/api/coffee/config/recipes',
          editingRecipe
        )
        if (!response.success) throw new Error(response.error)
        toast({ title: 'Recipe created' })
      } else {
        const response = await apiPut<CoffeeRecipe>(
          `/api/coffee/config/recipes/${editingRecipe.id}`,
          editingRecipe
        )
        if (!response.success) throw new Error(response.error)
        toast({ title: 'Recipe updated' })
      }
      setEditingRecipe(null)
      loadConfig()
    } catch (error) {
      toast({
        title: 'Error saving recipe',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================
  // DOSE HANDLERS
  // ============================================
  const handleSaveDose = async () => {
    if (!editingDose) return
    setIsSaving(true)

    try {
      if (isNewItem) {
        const response = await apiPost<QuickDose>(
          '/api/coffee/config/doses',
          editingDose
        )
        if (!response.success) throw new Error(response.error)
        toast({ title: 'Quick dose created' })
      } else {
        const response = await apiPut<QuickDose>(
          `/api/coffee/config/doses/${editingDose.id}`,
          editingDose
        )
        if (!response.success) throw new Error(response.error)
        toast({ title: 'Quick dose updated' })
      }
      setEditingDose(null)
      loadConfig()
    } catch (error) {
      toast({
        title: 'Error saving dose',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================
  // RULE HANDLERS
  // ============================================
  const handleSaveRule = async () => {
    if (!editingRule) return
    setIsSaving(true)

    try {
      if (isNewItem) {
        const response = await apiPost<GoldenRule>(
          '/api/coffee/config/rules',
          editingRule
        )
        if (!response.success) throw new Error(response.error)
        toast({ title: 'Golden rule created' })
      } else {
        const response = await apiPut<GoldenRule>(
          `/api/coffee/config/rules/${editingRule.id}`,
          editingRule
        )
        if (!response.success) throw new Error(response.error)
        toast({ title: 'Golden rule updated' })
      }
      setEditingRule(null)
      loadConfig()
    } catch (error) {
      toast({
        title: 'Error saving rule',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================
  // ROAST STRATEGY HANDLERS
  // ============================================
  const handleSaveStrategy = async () => {
    if (!editingStrategy) return
    setIsSaving(true)

    try {
      const response = await apiPut<RoastStrategy>(
        `/api/coffee/config/roast-strategies/${editingStrategy.id}`,
        editingStrategy
      )
      if (!response.success) throw new Error(response.error)
      toast({ title: 'Roast strategy updated' })
      setEditingStrategy(null)
      loadConfig()
    } catch (error) {
      toast({
        title: 'Error saving strategy',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================
  // RECOMMENDATION HANDLERS
  // ============================================
  const handleSaveRecommendation = async () => {
    if (!editingRecommendation) return
    setIsSaving(true)

    try {
      if (isNewItem) {
        const response = await apiPost<CoffeeRecommendation>(
          '/api/coffee/config/recommendations',
          editingRecommendation
        )
        if (!response.success) throw new Error(response.error)
        toast({ title: 'Recommendation created' })
      } else {
        const response = await apiPut<CoffeeRecommendation>(
          `/api/coffee/config/recommendations/${editingRecommendation.id}`,
          editingRecommendation
        )
        if (!response.success) throw new Error(response.error)
        toast({ title: 'Recommendation updated' })
      }
      setEditingRecommendation(null)
      loadConfig()
    } catch (error) {
      toast({
        title: 'Error saving recommendation',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================
  // DELETE HANDLER
  // ============================================
  const handleDelete = async () => {
    if (!deleteConfirm) return
    setIsSaving(true)

    try {
      let endpoint = ''
      switch (deleteConfirm.type) {
        case 'recipe':
          endpoint = `/api/coffee/config/recipes/${deleteConfirm.id}`
          break
        case 'dose':
          endpoint = `/api/coffee/config/doses/${deleteConfirm.id}`
          break
        case 'rule':
          endpoint = `/api/coffee/config/rules/${deleteConfirm.id}`
          break
        case 'recommendation':
          endpoint = `/api/coffee/config/recommendations/${deleteConfirm.id}`
          break
      }

      const response = await apiDelete(endpoint)
      if (!response.success) throw new Error(response.error)
      toast({ title: `${deleteConfirm.type} deleted` })
      setDeleteConfirm(null)
      loadConfig()
    } catch (error) {
      toast({
        title: 'Error deleting',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground">
            Failed to load coffee configuration
          </p>
          <Button onClick={loadConfig} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const switchRecipes = config.recipes.filter(r => r.method === 'switch')
  const moccaRecipes = config.recipes.filter(r => r.method === 'moccamaster')
  const switchDoses = config.quickDoses.filter(d => d.method === 'switch')
  const moccaDoses = config.quickDoses.filter(d => d.method === 'moccamaster')

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/coffee">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold">Coffee Configuration</h2>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadConfig}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={v => setActiveTab(v as EditorTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-4 mt-3 w-fit">
          <TabsTrigger value="recipes" className="gap-2">
            <Coffee className="h-4 w-4" />
            Recipes
          </TabsTrigger>
          <TabsTrigger value="doses" className="gap-2">
            <Scale className="h-4 w-4" />
            Doses
          </TabsTrigger>
          <TabsTrigger value="roasts" className="gap-2">
            <Flame className="h-4 w-4" />
            Roasts
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Clock className="h-4 w-4" />
            Schedules
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* RECIPES TAB */}
        {/* ============================================ */}
        <TabsContent
          value="recipes"
          className="flex-1 space-y-4 overflow-auto p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Manage brewing recipes for each method, cup size, and roast level.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setIsNewItem(true)
                setEditingRecipe({
                  id: '',
                  method: 'switch',
                  cupSize: '1-cup',
                  cupSizeLabel: '1 Cup (300ml)',
                  waterMl: 300,
                  roast: 'light',
                  ratio: '1:16',
                  coffee: 18.8,
                  temp: '212°F',
                  technique: '',
                  isActive: true,
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Recipe
            </Button>
          </div>

          {/* Switch Recipes */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Droplets className="h-4 w-4 text-amber-600" />
                Hario Switch ({switchRecipes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {switchRecipes.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onEdit={() => {
                      setIsNewItem(false)
                      setEditingRecipe(recipe)
                    }}
                    onDelete={() =>
                      setDeleteConfirm({
                        type: 'recipe',
                        id: recipe.id,
                        name: `${recipe.cupSizeLabel} ${recipe.roast}`,
                      })
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Moccamaster Recipes */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Coffee className="h-4 w-4 text-amber-600" />
                Moccamaster ({moccaRecipes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {moccaRecipes.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onEdit={() => {
                      setIsNewItem(false)
                      setEditingRecipe(recipe)
                    }}
                    onDelete={() =>
                      setDeleteConfirm({
                        type: 'recipe',
                        id: recipe.id,
                        name: `${recipe.cupSizeLabel} ${recipe.roast}`,
                      })
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* DOSES TAB */}
        {/* ============================================ */}
        <TabsContent
          value="doses"
          className="flex-1 space-y-4 overflow-auto p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Quick reference dose numbers for your grinder.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setIsNewItem(true)
                setEditingDose({
                  method: 'switch',
                  label: '',
                  grams: 0,
                  sortOrder: 0,
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Dose
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Switch Doses */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Droplets className="h-4 w-4 text-amber-600" />
                  Hario Switch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {switchDoses.map(dose => (
                  <DoseCard
                    key={dose.id}
                    dose={dose}
                    onEdit={() => {
                      setIsNewItem(false)
                      setEditingDose(dose)
                    }}
                    onDelete={() =>
                      setDeleteConfirm({
                        type: 'dose',
                        id: dose.id!,
                        name: dose.label,
                      })
                    }
                  />
                ))}
              </CardContent>
            </Card>

            {/* Moccamaster Doses */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coffee className="h-4 w-4 text-amber-600" />
                  Moccamaster
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {moccaDoses.map(dose => (
                  <DoseCard
                    key={dose.id}
                    dose={dose}
                    onEdit={() => {
                      setIsNewItem(false)
                      setEditingDose(dose)
                    }}
                    onDelete={() =>
                      setDeleteConfirm({
                        type: 'dose',
                        id: dose.id!,
                        name: dose.label,
                      })
                    }
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================ */}
        {/* ROASTS TAB */}
        {/* ============================================ */}
        <TabsContent
          value="roasts"
          className="flex-1 space-y-4 overflow-auto p-4"
        >
          <p className="text-muted-foreground text-sm">
            General brewing strategies for each roast level.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {config.roastStrategies.map(strategy => (
              <Card
                key={strategy.id}
                className="cursor-pointer transition-colors hover:border-amber-500/50"
                onClick={() => setEditingStrategy(strategy)}
              >
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="capitalize">{strategy.roast}</span>
                    <Badge variant="outline">{strategy.ratio}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0 text-sm">
                  <div>
                    <span className="text-muted-foreground">Goal:</span>{' '}
                    {strategy.goal}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Temp:</span>{' '}
                    {strategy.temp}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Technique:</span>{' '}
                    {strategy.technique}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ============================================ */}
        {/* RULES TAB */}
        {/* ============================================ */}
        <TabsContent
          value="rules"
          className="flex-1 space-y-4 overflow-auto p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Universal brewing rules that apply to every cup.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setIsNewItem(true)
                setEditingRule({
                  title: '',
                  description: '',
                  sortOrder: config.goldenRules.length,
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </div>

          <div className="space-y-2">
            {config.goldenRules.map((rule, idx) => (
              <Card key={rule.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-sm font-bold text-amber-600">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium">{rule.title}</div>
                      <div className="text-muted-foreground text-sm">
                        {rule.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsNewItem(false)
                        setEditingRule(rule)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setDeleteConfirm({
                          type: 'rule',
                          id: rule.id!,
                          name: rule.title,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ============================================ */}
        {/* RECOMMENDATIONS TAB */}
        {/* ============================================ */}
        <TabsContent
          value="recommendations"
          className="flex-1 space-y-4 overflow-auto p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Time-based recipe recommendations. Higher priority wins when
              multiple match.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setIsNewItem(true)
                setEditingRecommendation({
                  name: '',
                  dayOfWeek: null,
                  hourStart: 0,
                  hourEnd: 24,
                  method: 'moccamaster',
                  cupSize: '8-cup',
                  roast: 'medium',
                  priority: 0,
                  isActive: true,
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </div>

          <div className="space-y-2">
            {config.recommendations.map(rec => (
              <Card key={rec.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">
                        Priority
                      </div>
                      <div className="font-mono font-bold">{rec.priority}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rec.name}</span>
                        {!rec.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {rec.dayOfWeek !== null
                          ? DAYS_OF_WEEK.find(d => d.value === rec.dayOfWeek)
                              ?.label
                          : 'Any day'}
                        {' • '}
                        {rec.hourStart}:00 - {rec.hourEnd}:00
                        {' • '}
                        {METHODS.find(m => m.value === rec.method)?.label}{' '}
                        {rec.cupSize} {rec.roast}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsNewItem(false)
                        setEditingRecommendation(rec)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setDeleteConfirm({
                          type: 'recommendation',
                          id: rec.id!,
                          name: rec.name,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ============================================ */}
      {/* RECIPE EDIT DIALOG */}
      {/* ============================================ */}
      <Dialog
        open={!!editingRecipe}
        onOpenChange={() => setEditingRecipe(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isNewItem ? 'Add Recipe' : 'Edit Recipe'}
            </DialogTitle>
            <DialogDescription>
              Configure the brewing parameters for this recipe.
            </DialogDescription>
          </DialogHeader>
          {editingRecipe && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={editingRecipe.method}
                    onValueChange={v =>
                      setEditingRecipe({
                        ...editingRecipe,
                        method: v as BrewMethod,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Roast</Label>
                  <Select
                    value={editingRecipe.roast}
                    onValueChange={v =>
                      setEditingRecipe({
                        ...editingRecipe,
                        roast: v as RoastLevel,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROASTS.map(r => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cup Size</Label>
                  <Select
                    value={editingRecipe.cupSize}
                    onValueChange={v => {
                      const size = CUP_SIZES.find(s => s.value === v)
                      setEditingRecipe({
                        ...editingRecipe,
                        cupSize: v as CupSize,
                        cupSizeLabel: size?.label || v,
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUP_SIZES.filter(s =>
                        s.methods.includes(editingRecipe.method)
                      ).map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ratio</Label>
                  <Input
                    value={editingRecipe.ratio}
                    onChange={e =>
                      setEditingRecipe({
                        ...editingRecipe,
                        ratio: e.target.value,
                      })
                    }
                    placeholder="1:16"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Coffee (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingRecipe.coffee}
                    onChange={e =>
                      setEditingRecipe({
                        ...editingRecipe,
                        coffee: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Water (ml)</Label>
                  <Input
                    type="number"
                    value={editingRecipe.waterMl}
                    onChange={e =>
                      setEditingRecipe({
                        ...editingRecipe,
                        waterMl: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temp</Label>
                  <Input
                    value={editingRecipe.temp}
                    onChange={e =>
                      setEditingRecipe({
                        ...editingRecipe,
                        temp: e.target.value,
                      })
                    }
                    placeholder="212°F"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Technique</Label>
                <Textarea
                  value={editingRecipe.technique}
                  onChange={e =>
                    setEditingRecipe({
                      ...editingRecipe,
                      technique: e.target.value,
                    })
                  }
                  placeholder="Describe the brewing technique..."
                  rows={3}
                />
              </div>
              {editingRecipe.method === 'switch' && (
                <div className="space-y-2">
                  <Label>Switch Setting</Label>
                  <Select
                    value={editingRecipe.switchSetting || 'open'}
                    onValueChange={v =>
                      setEditingRecipe({
                        ...editingRecipe,
                        switchSetting: v as 'open' | 'closed' | 'hybrid',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open (V60 Mode)</SelectItem>
                      <SelectItem value="closed">Closed (Immersion)</SelectItem>
                      <SelectItem value="hybrid">
                        Hybrid (Flush then Steep)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingRecipe.method === 'moccamaster' && (
                <div className="space-y-2">
                  <Label>Jug Setting</Label>
                  <Select
                    value={editingRecipe.moccaSetting || 'full'}
                    onValueChange={v =>
                      setEditingRecipe({
                        ...editingRecipe,
                        moccaSetting: v as 'half' | 'full',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="half">
                        Half Jug (Pulse Flow)
                      </SelectItem>
                      <SelectItem value="full">Full Jug (Open Flow)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecipe(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRecipe} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DOSE EDIT DIALOG */}
      {/* ============================================ */}
      <Dialog open={!!editingDose} onOpenChange={() => setEditingDose(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isNewItem ? 'Add Quick Dose' : 'Edit Quick Dose'}
            </DialogTitle>
          </DialogHeader>
          {editingDose && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Method</Label>
                <Select
                  value={editingDose.method}
                  onValueChange={v =>
                    setEditingDose({ ...editingDose, method: v as BrewMethod })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={editingDose.label}
                  onChange={e =>
                    setEditingDose({ ...editingDose, label: e.target.value })
                  }
                  placeholder="e.g., 2 Cups (Standard)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grams</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingDose.grams}
                    onChange={e =>
                      setEditingDose({
                        ...editingDose,
                        grams: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={editingDose.sortOrder || 0}
                    onChange={e =>
                      setEditingDose({
                        ...editingDose,
                        sortOrder: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Input
                  value={editingDose.note || ''}
                  onChange={e =>
                    setEditingDose({ ...editingDose, note: e.target.value })
                  }
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDose(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDose} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* RULE EDIT DIALOG */}
      {/* ============================================ */}
      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isNewItem ? 'Add Golden Rule' : 'Edit Golden Rule'}
            </DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingRule.title}
                  onChange={e =>
                    setEditingRule({ ...editingRule, title: e.target.value })
                  }
                  placeholder="Rule title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingRule.description}
                  onChange={e =>
                    setEditingRule({
                      ...editingRule,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the rule..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editingRule.sortOrder || 0}
                  onChange={e =>
                    setEditingRule({
                      ...editingRule,
                      sortOrder: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* ROAST STRATEGY EDIT DIALOG */}
      {/* ============================================ */}
      <Dialog
        open={!!editingStrategy}
        onOpenChange={() => setEditingStrategy(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">
              Edit {editingStrategy?.roast} Roast Strategy
            </DialogTitle>
          </DialogHeader>
          {editingStrategy && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Goal</Label>
                <Input
                  value={editingStrategy.goal}
                  onChange={e =>
                    setEditingStrategy({
                      ...editingStrategy,
                      goal: e.target.value,
                    })
                  }
                  placeholder="e.g., Acidity & Complexity"
                />
              </div>
              <div className="space-y-2">
                <Label>Temperature</Label>
                <Input
                  value={editingStrategy.temp}
                  onChange={e =>
                    setEditingStrategy({
                      ...editingStrategy,
                      temp: e.target.value,
                    })
                  }
                  placeholder="e.g., 212°F (Boiling)"
                />
              </div>
              <div className="space-y-2">
                <Label>Ratio</Label>
                <Input
                  value={editingStrategy.ratio}
                  onChange={e =>
                    setEditingStrategy({
                      ...editingStrategy,
                      ratio: e.target.value,
                    })
                  }
                  placeholder="e.g., 1:16 or 1:17"
                />
              </div>
              <div className="space-y-2">
                <Label>Technique</Label>
                <Textarea
                  value={editingStrategy.technique}
                  onChange={e =>
                    setEditingStrategy({
                      ...editingStrategy,
                      technique: e.target.value,
                    })
                  }
                  placeholder="Describe the technique..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStrategy(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStrategy} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* RECOMMENDATION EDIT DIALOG */}
      {/* ============================================ */}
      <Dialog
        open={!!editingRecommendation}
        onOpenChange={() => setEditingRecommendation(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isNewItem ? 'Add Schedule' : 'Edit Schedule'}
            </DialogTitle>
            <DialogDescription>
              Configure when this recipe should be recommended.
            </DialogDescription>
          </DialogHeader>
          {editingRecommendation && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingRecommendation.name}
                  onChange={e =>
                    setEditingRecommendation({
                      ...editingRecommendation,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g., Morning Batch"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={editingRecommendation.dayOfWeek?.toString() ?? 'any'}
                    onValueChange={v =>
                      setEditingRecommendation({
                        ...editingRecommendation,
                        dayOfWeek: v === 'any' ? null : parseInt(v),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(d => (
                        <SelectItem
                          key={d.value?.toString() ?? 'any'}
                          value={d.value?.toString() ?? 'any'}
                        >
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={editingRecommendation.priority}
                    onChange={e =>
                      setEditingRecommendation({
                        ...editingRecommendation,
                        priority: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Hour (0-23)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={editingRecommendation.hourStart}
                    onChange={e =>
                      setEditingRecommendation({
                        ...editingRecommendation,
                        hourStart: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Hour (1-24)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={editingRecommendation.hourEnd}
                    onChange={e =>
                      setEditingRecommendation({
                        ...editingRecommendation,
                        hourEnd: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={editingRecommendation.method}
                    onValueChange={v =>
                      setEditingRecommendation({
                        ...editingRecommendation,
                        method: v as BrewMethod,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cup Size</Label>
                  <Select
                    value={editingRecommendation.cupSize}
                    onValueChange={v =>
                      setEditingRecommendation({
                        ...editingRecommendation,
                        cupSize: v as CupSize,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUP_SIZES.filter(s =>
                        s.methods.includes(editingRecommendation.method)
                      ).map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Roast</Label>
                  <Select
                    value={editingRecommendation.roast}
                    onValueChange={v =>
                      setEditingRecommendation({
                        ...editingRecommendation,
                        roast: v as RoastLevel,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROASTS.map(r => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingRecommendation(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRecommendation} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ============================================ */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteConfirm?.type}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirm?.name}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// SUBCOMPONENTS
// ============================================

function RecipeCard({
  recipe,
  onEdit,
  onDelete,
}: {
  recipe: CoffeeRecipe
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {recipe.roast}
          </Badge>
          <span className="truncate text-sm font-medium">
            {recipe.cupSizeLabel}
          </span>
        </div>
        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
          <Scale className="h-3 w-3" />
          <span>{recipe.coffee}g</span>
          <span>•</span>
          <span>{recipe.ratio}</span>
          <span>•</span>
          <span>{recipe.temp}</span>
        </div>
      </div>
      <div className="ml-2 flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function DoseCard({
  dose,
  onEdit,
  onDelete,
}: {
  dose: QuickDose
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-muted/30 flex items-center justify-between rounded-lg border p-2">
      <div className="flex items-center gap-3">
        <span className="font-mono text-lg font-bold">{dose.grams}g</span>
        <span className="text-muted-foreground text-sm">{dose.label}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
