/**
 * Trader Joe's Recipe Sync Script
 * Standalone script to scrape and cache all Trader Joe's recipes
 * 
 * Usage:
 *   node scripts/sync-trader-joes.js
 *   node scripts/sync-trader-joes.js --skip-existing
 *   node scripts/sync-trader-joes.js --force
 */

// Try to load dotenv if available (optional)
try {
  require('dotenv').config({ path: '.env.local' })
  require('dotenv').config({ path: '.env' })
} catch (e) {
  // dotenv not installed, assume env vars are already set
  console.log('Note: dotenv not found, using environment variables directly')
}

const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in environment variables')
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
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
const skipExisting = !args.includes('--force') && (args.includes('--skip-existing') || true)
const force = args.includes('--force')

console.log('🍳 Trader Joe\'s Recipe Sync Script')
console.log('=====================================')
console.log(`Skip Existing: ${skipExisting}`)
console.log(`Force Re-scrape: ${force}`)
console.log('=====================================\n')

/**
 * Scrape all recipe URLs from Trader Joe's recipes page (with pagination)
 */
async function scrapeAllRecipeUrls() {
  console.log('Phase 1: Collecting all recipe URLs...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    const allRecipes = []
    let currentPage = 1
    let hasMorePages = true

    while (hasMorePages) {
      const url = `https://www.traderjoes.com/home/recipes?page=${currentPage}`
      console.log(`  Scraping page ${currentPage}...`)

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

      // Wait for recipe grid to load
      await page.waitForSelector('.RecipesGrid_recipesGrid__results__CGnEX', { timeout: 10000 }).catch(() => {})

      // Extract recipe listings from current page
      const pageRecipes = await page.evaluate(() => {
        const recipes = []
        const recipeLinks = document.querySelectorAll('a.RecipeGridCard_recipe__1Wo__')

        recipeLinks.forEach((link) => {
          const href = link.getAttribute('href')
          if (!href || !href.includes('/recipes/')) return

          const titleEl = link.querySelector('.RecipeGridCard_recipe__title__3-8S-')
          const name = titleEl?.textContent?.trim()

          const categoryEl = link.querySelector('.RecipeGridCard_recipe__categories__3b5AM')
          const category = categoryEl?.textContent?.trim()

          const imgEl = link.querySelector('img')
          const imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('srcoriginal') || undefined

          if (name) {
            const fullUrl = href.startsWith('http') ? href : `https://www.traderjoes.com${href}`
            if (!recipes.find((r) => r.url === fullUrl)) {
              recipes.push({
                name,
                url: fullUrl,
                category,
                image_url: imageUrl,
              })
            }
          }
        })

        return recipes
      })

      allRecipes.push(...pageRecipes)
      console.log(`  Found ${pageRecipes.length} recipes on page ${currentPage} (total: ${allRecipes.length})`)

      // Check if there's a next page
      const hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector(
          '.Pagination_pagination__arrow_side_right__9YUGr:not(.Pagination_pagination__arrow_disabled__1Dx6c)'
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

    console.log(`✓ Phase 1 complete: Found ${allRecipes.length} recipes\n`)
    return allRecipes
  } finally {
    await browser.close()
  }
}

/**
 * Scrape a single recipe from a Trader Joe's URL
 */
async function scrapeRecipeFromUrl(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    await page.waitForSelector('.RecipeDetails_recipeDetails__title__3u3WX, h1', { timeout: 10000 }).catch(() => {})

    const recipeData = await page.evaluate(() => {
      // Title
      const titleEl = document.querySelector('.RecipeDetails_recipeDetails__title__3u3WX') || document.querySelector('h1')
      const name = titleEl?.textContent?.trim() || 'Untitled Recipe'

      // Categories
      const categories = []
      const categoryContainer = document.querySelector('[data-testid="categoriesList"]')
      if (categoryContainer) {
        const categoryLinks = categoryContainer.querySelectorAll('a')
        categoryLinks.forEach((link) => {
          const categoryText = link.textContent?.trim()
          if (categoryText) {
            categories.push(categoryText)
          }
        })
      }
      const primaryCategory = categories[0] || undefined

      // Image
      const imgEl =
        document.querySelector('.RecipeDetails_recipeDetails__image__sqUNx img') ||
        document.querySelector('.RecipeDetails_recipeDetails__imageWrapper__3GabF img') ||
        document.querySelector('picture img')
      const imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('srcoriginal') || ''

      // Description
      const descriptionParts = []
      const descContainer = document.querySelector('.RecipeDetails_recipeDetails__description__qxivx')
      if (descContainer) {
        const paragraphs = descContainer.querySelectorAll('p')
        paragraphs.forEach((p) => {
          const text = p.textContent?.trim()
          if (text) {
            descriptionParts.push(text)
          }
        })
      }
      const description = descriptionParts.join('\n\n')

      // Fun tags
      const tags = []
      const funTags = document.querySelectorAll('.RecipeDetails_recipeDetails__funTag__3jKQz')
      funTags.forEach((tagEl) => {
        const tagText = tagEl.querySelector('.FunTag_tag__text__1FfQ6')?.textContent?.trim()
        if (tagText) {
          tags.push(tagText)
        }
      })

      // Complexity info
      let servings
      let timeMinutes
      const complexityItems = document.querySelectorAll('.RecipeDetails_recipeDetails__complexityItem__2X49n')
      complexityItems.forEach((item) => {
        const text = item.textContent?.trim() || ''
        const servesMatch = text.match(/serves?\s+(\d+)(?:-(\d+))?/i)
        if (servesMatch) {
          servings = parseInt(servesMatch[1])
        }
        const timeMatch = text.match(/time\s+(\d+)\s*(?:min|minute)/i)
        if (timeMatch) {
          timeMinutes = parseInt(timeMatch[1])
        }
      })

      // Ingredients and Instructions
      const ingredients = []
      const instructions = []

      const ingredientSection = Array.from(document.querySelectorAll('*')).find((el) => {
        const text = el.textContent || ''
        return (
          text.toLowerCase().includes('ingredient') &&
          (el.querySelectorAll('li').length > 0 || el.querySelectorAll('ul').length > 0)
        )
      })

      if (ingredientSection) {
        const listItems = ingredientSection.querySelectorAll('li')
        listItems.forEach((li) => {
          const text = li.textContent?.trim()
          if (text && text.length > 0) {
            ingredients.push(text)
          }
        })
      }

      const instructionSection = Array.from(document.querySelectorAll('*')).find((el) => {
        const text = el.textContent || ''
        return (
          (text.toLowerCase().includes('instruction') ||
            text.toLowerCase().includes('direction') ||
            text.toLowerCase().includes('step')) &&
          (el.querySelectorAll('li').length > 0 || el.querySelectorAll('ol').length > 0)
        )
      })

      if (instructionSection) {
        const listItems = instructionSection.querySelectorAll('li')
        listItems.forEach((li) => {
          const text = li.textContent?.trim()
          if (text && text.length > 0 && !text.match(/^\d+\.?\s*$/)) {
            instructions.push(text.replace(/^\d+\.?\s*/, '').trim())
          }
        })
      }

      return {
        name,
        description,
        imageUrl,
        categories,
        primaryCategory,
        tags,
        servings,
        timeMinutes,
        ingredients,
        instructions,
      }
    })

    // Extract recipe slug from URL
    const urlMatch = url.match(/\/recipes\/([^\/\?]+)/)
    const recipeSlug = urlMatch ? urlMatch[1] : undefined

    const fullUrl = url.startsWith('http') ? url : `https://www.traderjoes.com${url}`

    return {
      tj_recipe_id: recipeSlug,
      name: recipeData.name,
      url: fullUrl,
      category: recipeData.primaryCategory,
      image_url: recipeData.imageUrl || undefined,
      recipe_data: {
        description: recipeData.description || undefined,
        prep_time: recipeData.timeMinutes,
        cook_time: undefined,
        servings: recipeData.servings,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        tags: recipeData.tags.length > 0 ? recipeData.tags : undefined,
        categories: recipeData.categories.length > 0 ? recipeData.categories : undefined,
      },
    }
  } finally {
    await browser.close()
  }
}

/**
 * Check if recipe is already cached
 */
async function isRecipeCached(url) {
  const { data, error } = await supabase.from('trader_joes_recipes_cache').select('id, last_scraped_at').eq('url', url).single()

  if (error || !data) return false

  // Check if cache is fresh (less than 7 days old)
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
 * Main sync function
 */
async function syncRecipes() {
  const startTime = Date.now()
  let synced = 0
  let errors = 0

  try {
    // Phase 1: Get all recipe URLs
    const allRecipeUrls = await scrapeAllRecipeUrls()

    // Phase 2: Scrape each recipe
    console.log('Phase 2: Scraping individual recipe pages...\n')
    for (let i = 0; i < allRecipeUrls.length; i++) {
      const listing = allRecipeUrls[i]
      try {
        // Check if already cached
        if (skipExisting && !force) {
          const cached = await isRecipeCached(listing.url)
          if (cached) {
            console.log(`[${i + 1}/${allRecipeUrls.length}] ⏭️  Skipping ${listing.name} - already cached`)
            continue
          }
        }

        console.log(`[${i + 1}/${allRecipeUrls.length}] 🔍 Scraping: ${listing.name}`)

        // Scrape recipe details
        const recipe = await scrapeRecipeFromUrl(listing.url)
        if (recipe) {
          // Merge listing data with scraped data
          const fullRecipe = {
            ...recipe,
            name: listing.name || recipe.name,
            image_url: listing.image_url || recipe.image_url,
            category: listing.category || recipe.category,
          }

          await cacheRecipe(fullRecipe)
          synced++
          console.log(`  ✓ Cached: ${fullRecipe.name}`)
        } else {
          console.log(`  ✗ Failed to scrape: ${listing.name}`)
          errors++
        }

        // Rate limiting - wait 2 seconds between requests
        if (i < allRecipeUrls.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(`  ✗ Error scraping recipe ${listing.url}:`, error.message)
        errors++
      }
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
    console.log('\n=====================================')
    console.log('✅ Sync Complete!')
    console.log(`   Synced: ${synced} recipes`)
    console.log(`   Errors: ${errors} recipes`)
    console.log(`   Total: ${synced + errors} recipes`)
    console.log(`   Duration: ${duration} minutes`)
    console.log('=====================================')

    return { synced, errors, total: synced + errors }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message)
    throw error
  }
}

// Run the sync
syncRecipes()
  .then((result) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
