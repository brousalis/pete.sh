/**
 * Trader Joe's Recipe Sync Script
 * Standalone script to scrape and cache all Trader Joe's recipes
 *
 * Usage:
 *   node scripts/sync-trader-joes.js                          # Sync all (skip existing)
 *   node scripts/sync-trader-joes.js --force                  # Re-scrape all recipes
 *   node scripts/sync-trader-joes.js --clear                  # Clear DB before syncing
 *   node scripts/sync-trader-joes.js --test <url>             # Test scrape a single recipe
 *   node scripts/sync-trader-joes.js --clear --test <url>     # Clear DB then test one recipe
 */

// Try to load dotenv if available (optional)
try {
  require('dotenv').config({ path: '.env.local' })
  require('dotenv').config({ path: '.env' })
} catch (e) {
  console.log('Note: dotenv not found, using environment variables directly')
}

const puppeteer = require('puppeteer-core')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

/**
 * Find a Chrome/Chromium executable on the system.
 * Supports Windows, macOS, and Linux.
 */
function findChrome() {
  const candidates =
    process.platform === 'win32'
      ? [
          path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium']

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }

  console.error('Could not find Chrome/Chromium. Install Chrome or set CHROME_PATH env var.')
  console.error('Searched:', candidates.join('\n  '))
  process.exit(1)
}

const CHROME_PATH = process.env.CHROME_PATH || findChrome()

const TJ_BASE_URL = 'https://www.traderjoes.com'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment variables')
  console.error('  Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Parse command line arguments
const args = process.argv.slice(2)
const force = args.includes('--force')
const clear = args.includes('--clear')
const skipExisting = !force
const testIndex = args.indexOf('--test')
const testUrl = testIndex !== -1 ? args[testIndex + 1] : null

console.log('Trader Joe\'s Recipe Sync Script')
console.log('=====================================')
if (testUrl) {
  console.log(`Mode: Single recipe test`)
  console.log(`URL: ${testUrl}`)
} else {
  console.log(`Skip Existing: ${skipExisting}`)
  console.log(`Force Re-scrape: ${force}`)
}
if (clear) console.log('Clear DB: yes')
console.log('=====================================\n')

/**
 * Resolve a potentially relative URL to an absolute TJ URL
 */
function resolveUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${TJ_BASE_URL}${url}`
  return url
}

/**
 * Create a shared browser instance
 */
async function createBrowser() {
  return puppeteer.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

/**
 * Create a new page with a realistic user agent
 */
async function createPage(browser) {
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )
  return page
}

/**
 * Scrape all recipe URLs from Trader Joe's recipes page (with pagination)
 */
async function scrapeAllRecipeUrls(browser) {
  console.log('Phase 1: Collecting all recipe URLs...')
  const page = await createPage(browser)

  try {
    const allRecipes = []
    let currentPage = 1
    let hasMorePages = true

    while (hasMorePages) {
      const url = `${TJ_BASE_URL}/home/recipes?page=${currentPage}`
      console.log(`  Scraping page ${currentPage}...`)

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      await page.waitForSelector('[class*="RecipesGrid_recipesGrid__results"]', { timeout: 10000 }).catch(() => {})

      const pageRecipes = await page.evaluate((baseUrl) => {
        const recipes = []
        const recipeLinks = document.querySelectorAll('a[class*="RecipeGridCard_recipe"]')

        recipeLinks.forEach((link) => {
          const href = link.getAttribute('href')
          if (!href || !href.includes('/recipes/')) return

          const titleEl = link.querySelector('[class*="RecipeGridCard_recipe__title"]')
          const name = titleEl?.textContent?.trim()

          const categoryEl = link.querySelector('[class*="RecipeGridCard_recipe__categories"]')
          const category = categoryEl?.textContent?.trim()

          const imgEl = link.querySelector('img')
          const imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('srcoriginal') || undefined

          if (name) {
            const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`
            if (!recipes.find((r) => r.url === fullUrl)) {
              recipes.push({ name, url: fullUrl, category, image_url: imageUrl })
            }
          }
        })

        return recipes
      }, TJ_BASE_URL)

      allRecipes.push(...pageRecipes)
      console.log(`  Found ${pageRecipes.length} recipes on page ${currentPage} (total: ${allRecipes.length})`)

      const hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector(
          '[class*="Pagination_pagination__arrow_side_right"]:not([class*="disabled"])'
        )
        return nextButton !== null && !nextButton.hasAttribute('disabled')
      })

      if (!hasNextPage) {
        hasMorePages = false
      } else {
        currentPage++
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`Phase 1 complete: Found ${allRecipes.length} recipes\n`)
    return allRecipes
  } finally {
    await page.close()
  }
}

/**
 * Scrape a single recipe page using precise CSS selectors that target
 * the actual recipe content sections (not navigation/footer elements).
 */
async function scrapeRecipeFromPage(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  await page
    .waitForSelector('[class*="RecipeDetails_recipeDetails__title"], h1', { timeout: 10000 })
    .catch(() => {})

  const recipeData = await page.evaluate((baseUrl) => {
    // --- Title ---
    const titleEl =
      document.querySelector('[class*="RecipeDetails_recipeDetails__title"]') ||
      document.querySelector('h1')
    const name = titleEl?.textContent?.trim() || 'Untitled Recipe'

    // --- Categories ---
    const categories = []
    const categoryContainer = document.querySelector('[data-testid="categoriesList"]')
    if (categoryContainer) {
      categoryContainer.querySelectorAll('a').forEach((link) => {
        let text = link.textContent?.trim()
        if (text) {
          text = text.replace(/,\s*$/, '').trim()
          if (text) categories.push(text)
        }
      })
    }
    const primaryCategory = categories[0] || undefined

    // --- Image ---
    const imgEl =
      document.querySelector('[class*="RecipeDetails_recipeDetails__image"] img') ||
      document.querySelector('[class*="RecipeDetails_recipeDetails__imageWrapper"] img')
    let imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('srcoriginal') || ''
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${baseUrl}${imageUrl}`
    }
    const imageAlt = imgEl?.getAttribute('alt') || ''

    // --- Description ---
    const descriptionParts = []
    const descContainer = document.querySelector('[class*="RecipeDetails_recipeDetails__description"]')
    if (descContainer) {
      const expandContainer = descContainer.querySelector('[class*="Expand_expand__container"]')
      const target = expandContainer || descContainer
      target.querySelectorAll('p').forEach((p) => {
        const text = p.textContent?.trim()
        if (text) descriptionParts.push(text)
      })
    }
    const description = descriptionParts.join('\n\n')

    // --- Fun Tags ---
    const tags = []
    document.querySelectorAll('[class*="RecipeDetails_recipeDetails__funTag"]').forEach((tagEl) => {
      const tagText = tagEl.querySelector('[class*="FunTag_tag__text"]')?.textContent?.trim()
      if (tagText) tags.push(tagText)
    })

    // --- Servings & Time (richer extraction) ---
    let servingsMin = undefined
    let servingsMax = undefined
    let servingsText = undefined
    let timeMin = undefined
    let timeMax = undefined
    let timeText = undefined

    document.querySelectorAll('[class*="RecipeDetails_recipeDetails__complexityItem"]').forEach((item) => {
      const text = item.textContent?.trim() || ''

      const servesMatch = text.match(/serves?\s+(\d+)(?:\s*-\s*(\d+))?/i)
      if (servesMatch) {
        servingsMin = parseInt(servesMatch[1])
        servingsMax = servesMatch[2] ? parseInt(servesMatch[2]) : servingsMin
        servingsText = text
      }

      const timeMatch = text.match(/time\s+(\d+)\s*(?:min|minute)s?(?:\s*-\s*(\d+)\s*(?:min|minute)s?)?/i)
      if (timeMatch) {
        timeMin = parseInt(timeMatch[1])
        timeMax = timeMatch[2] ? parseInt(timeMatch[2]) : timeMin
        timeText = text.replace(/^time\s+/i, '').trim()
      }
    })

    // --- Ingredients (precise selectors) ---
    const ingredients = []

    // Primary: target the ingredient list items by their specific class
    let ingredientItems = document.querySelectorAll('li[class*="IngredientsList_ingredientsList__item"]')

    // Fallback: use the container ID pattern
    if (ingredientItems.length === 0) {
      const container = document.querySelector('[id*="recipe_ingredients"]')
      if (container) {
        ingredientItems = container.querySelectorAll('li')
      }
    }

    // Second fallback: target the RecipeIngredients wrapper
    if (ingredientItems.length === 0) {
      const wrapper = document.querySelector('[class*="RecipeIngredients_recipeIngredients"]')
      if (wrapper) {
        ingredientItems = wrapper.querySelectorAll('li')
      }
    }

    ingredientItems.forEach((li) => {
      const text = li.textContent?.trim()
      if (text && text.length > 2) {
        ingredients.push(text)
      }
    })

    // --- Directions (precise selectors) ---
    const instructions = []

    // Primary: target direction step items by their specific class
    let stepItems = document.querySelectorAll('li[class*="RecipeDirections_steps__item"]')

    // Fallback: use the container ID pattern (the one ending with recipe_directions, not with a numeric suffix)
    if (stepItems.length === 0) {
      const containers = document.querySelectorAll('[id*="recipe_directions"]')
      containers.forEach((container) => {
        if (stepItems.length === 0) {
          const items = container.querySelectorAll('ol li')
          if (items.length > 0) {
            stepItems = items
          }
        }
      })
    }

    // Second fallback: target the RecipeDirections wrapper
    if (stepItems.length === 0) {
      const wrapper = document.querySelector('[class*="RecipeDirections_wrap"]')
      if (wrapper) {
        stepItems = wrapper.querySelectorAll('ol li')
      }
    }

    stepItems.forEach((li) => {
      // Extract text from the content div's paragraphs for clean text
      const contentDiv = li.querySelector('[class*="RecipeDirections_steps__content"]')
      let text = ''

      if (contentDiv) {
        const paragraphs = contentDiv.querySelectorAll('p')
        const parts = []
        paragraphs.forEach((p) => {
          const pText = p.textContent?.trim()
          if (pText) parts.push(pText)
        })
        text = parts.join(' ')
      } else {
        text = li.textContent?.trim() || ''
      }

      text = text.replace(/^\d+\.?\s*/, '').trim()
      if (text && text.length > 2) {
        instructions.push(text)
      }
    })

    return {
      name,
      description,
      imageUrl,
      imageAlt,
      categories,
      primaryCategory,
      tags,
      servingsMin,
      servingsMax,
      servingsText,
      timeMin,
      timeMax,
      timeText,
      ingredients,
      instructions,
    }
  }, TJ_BASE_URL)

  // Extract recipe slug from URL
  const urlMatch = url.match(/\/recipes\/([^\/\?]+)/)
  const recipeSlug = urlMatch ? urlMatch[1] : undefined
  const fullUrl = resolveUrl(url)

  return {
    tj_recipe_id: recipeSlug,
    name: recipeData.name,
    url: fullUrl,
    category: recipeData.primaryCategory,
    image_url: recipeData.imageUrl ? resolveUrl(recipeData.imageUrl) : undefined,
    recipe_data: {
      description: recipeData.description || undefined,
      prep_time: recipeData.timeMin,
      cook_time: undefined,
      time_min: recipeData.timeMin,
      time_max: recipeData.timeMax,
      time_text: recipeData.timeText || undefined,
      servings: recipeData.servingsMin,
      servings_min: recipeData.servingsMin,
      servings_max: recipeData.servingsMax,
      servings_text: recipeData.servingsText || undefined,
      ingredients: recipeData.ingredients,
      instructions: recipeData.instructions,
      tags: recipeData.tags.length > 0 ? recipeData.tags : undefined,
      categories: recipeData.categories.length > 0 ? recipeData.categories : undefined,
      image_alt: recipeData.imageAlt || undefined,
    },
  }
}

/**
 * Check if recipe is already cached (less than 7 days old)
 */
async function isRecipeCached(url) {
  const { data, error } = await supabase
    .from('trader_joes_recipes_cache')
    .select('id, last_scraped_at')
    .eq('url', url)
    .single()

  if (error || !data) return false

  const cacheAge = Date.now() - new Date(data.last_scraped_at).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return cacheAge < sevenDays
}

/**
 * Cache a recipe to Supabase
 */
async function cacheRecipe(recipe) {
  const { data, error } = await supabase
    .from('trader_joes_recipes_cache')
    .upsert(
      {
        tj_recipe_id: recipe.tj_recipe_id || null,
        name: recipe.name,
        url: recipe.url,
        category: recipe.category || null,
        image_url: recipe.image_url || null,
        recipe_data: recipe.recipe_data,
        last_scraped_at: new Date().toISOString(),
      },
      { onConflict: 'url' }
    )
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to cache recipe: ${error.message}`)
  }

  return data
}

/**
 * Clear all recipes from the cache table
 */
async function clearCache() {
  console.log('Clearing trader_joes_recipes_cache...')
  const { error } = await supabase.from('trader_joes_recipes_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) {
    throw new Error(`Failed to clear cache: ${error.message}`)
  }
  console.log('Cache cleared.\n')
}

/**
 * Test: scrape a single recipe URL, print parsed data, and cache it
 */
async function testSingleRecipe(url) {
  console.log(`Testing single recipe: ${url}\n`)

  const browser = await createBrowser()
  try {
    const page = await createPage(browser)
    const recipe = await scrapeRecipeFromPage(page, url)

    console.log('--- Parsed Recipe Data ---')
    console.log(`Name: ${recipe.name}`)
    console.log(`URL: ${recipe.url}`)
    console.log(`Category: ${recipe.category}`)
    console.log(`Image URL: ${recipe.image_url}`)
    console.log(`TJ Recipe ID: ${recipe.tj_recipe_id}`)
    console.log('')

    const rd = recipe.recipe_data
    console.log('--- recipe_data ---')
    console.log(`Description: ${rd.description ? rd.description.substring(0, 200) + '...' : '(none)'}`)
    console.log(`Servings: ${rd.servings_text || rd.servings || '(none)'}`)
    console.log(`  min: ${rd.servings_min}, max: ${rd.servings_max}`)
    console.log(`Time: ${rd.time_text || '(none)'}`)
    console.log(`  min: ${rd.time_min} mins, max: ${rd.time_max} mins`)
    console.log(`Tags: ${rd.tags ? rd.tags.join(', ') : '(none)'}`)
    console.log(`Categories: ${rd.categories ? rd.categories.join(', ') : '(none)'}`)
    console.log(`Image Alt: ${rd.image_alt ? rd.image_alt.substring(0, 120) + '...' : '(none)'}`)
    console.log('')

    console.log(`Ingredients (${rd.ingredients.length}):`)
    rd.ingredients.forEach((ing, i) => console.log(`  ${i + 1}. ${ing}`))
    console.log('')

    console.log(`Instructions (${rd.instructions.length}):`)
    rd.instructions.forEach((inst, i) => console.log(`  ${i + 1}. ${inst}`))
    console.log('')

    // Cache to DB
    await cacheRecipe(recipe)
    console.log('Recipe cached to database successfully.')

    await page.close()
    return recipe
  } finally {
    await browser.close()
  }
}

/**
 * Main sync function: scrape all recipes and cache them
 */
async function syncAllRecipes() {
  const startTime = Date.now()
  let synced = 0
  let errors = 0

  const browser = await createBrowser()

  try {
    // Phase 1: Get all recipe URLs
    const allRecipeUrls = await scrapeAllRecipeUrls(browser)

    // Phase 2: Scrape each recipe (reuse single page)
    console.log('Phase 2: Scraping individual recipe pages...\n')
    const page = await createPage(browser)

    for (let i = 0; i < allRecipeUrls.length; i++) {
      const listing = allRecipeUrls[i]
      try {
        if (skipExisting && !force) {
          const cached = await isRecipeCached(listing.url)
          if (cached) {
            console.log(`[${i + 1}/${allRecipeUrls.length}] Skipping ${listing.name} - already cached`)
            continue
          }
        }

        console.log(`[${i + 1}/${allRecipeUrls.length}] Scraping: ${listing.name}`)

        const recipe = await scrapeRecipeFromPage(page, listing.url)
        if (recipe) {
          const fullRecipe = {
            ...recipe,
            name: listing.name || recipe.name,
            image_url: listing.image_url || recipe.image_url,
            category: listing.category || recipe.category,
          }

          await cacheRecipe(fullRecipe)
          synced++
          console.log(`  Cached: ${fullRecipe.name} (${fullRecipe.recipe_data.ingredients.length} ingredients, ${fullRecipe.recipe_data.instructions.length} steps)`)
        } else {
          console.log(`  Failed to scrape: ${listing.name}`)
          errors++
        }

        // Rate limiting
        if (i < allRecipeUrls.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(`  Error scraping ${listing.url}:`, error.message)
        errors++
      }
    }

    await page.close()

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
    console.log('\n=====================================')
    console.log('Sync Complete!')
    console.log(`   Synced: ${synced} recipes`)
    console.log(`   Errors: ${errors} recipes`)
    console.log(`   Total: ${synced + errors} recipes`)
    console.log(`   Duration: ${duration} minutes`)
    console.log('=====================================')

    return { synced, errors, total: synced + errors }
  } catch (error) {
    console.error('\nFatal error:', error.message)
    throw error
  } finally {
    await browser.close()
  }
}

// --- Entry point ---
async function main() {
  if (clear) {
    await clearCache()
  }

  if (testUrl) {
    await testSingleRecipe(testUrl)
  } else {
    await syncAllRecipes()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
