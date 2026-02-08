/**
 * Admin Cleanup API
 * 
 * POST /api/admin/cleanup - Run cleanup on all tables or specific tables
 * GET /api/admin/cleanup - Get table statistics and cleanup status
 * 
 * This endpoint requires the Supabase service role key to be configured.
 * It's intended to be called by:
 * - Manual admin action
 * - Scheduled cron job (e.g., daily)
 */

import { NextRequest } from 'next/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/utils'
import { 
  cleanupAllTables, 
  cleanupTable, 
  getTableStats, 
  isCleanupAvailable,
  DEFAULT_RETENTION_DAYS,
  type CleanupTable
} from '@/lib/utils/data-cleanup'
import { isLocalMode } from '@/lib/utils/mode'

/**
 * GET /api/admin/cleanup
 * Returns table statistics and cleanup availability status
 */
export async function GET() {
  try {
    const stats = await getTableStats()
    
    return successResponse({
      available: isCleanupAvailable(),
      isLocalMode: isLocalMode(),
      retentionPolicies: DEFAULT_RETENTION_DAYS,
      tableStats: stats,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/admin/cleanup
 * Run cleanup operation
 * 
 * Body options:
 * - table?: CleanupTable - Specific table to clean (optional, cleans all if not specified)
 * - retentionDays?: number - Override retention period (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cleanup is available
    if (!isCleanupAvailable()) {
      return errorResponse(
        'Cleanup not available. Requires Supabase service role key.',
        403
      )
    }

    // Only allow cleanup in local mode (for safety)
    if (!isLocalMode()) {
      return errorResponse(
        'Cleanup only available in local mode for safety. ' +
        'To run in production, call the database functions directly.',
        403
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { table, retentionDays } = body as { 
      table?: CleanupTable
      retentionDays?: number 
    }

    // If specific table requested, clean that table
    if (table) {
      // Validate table name
      if (!(table in DEFAULT_RETENTION_DAYS)) {
        return errorResponse(
          `Invalid table: ${table}. Valid tables: ${Object.keys(DEFAULT_RETENTION_DAYS).join(', ')}`,
          400
        )
      }

      const result = await cleanupTable(table, retentionDays)
      
      if (result.error) {
        return errorResponse(result.error, 500)
      }

      return successResponse({
        message: `Cleaned up ${result.deletedCount} records from ${table}`,
        result,
      })
    }

    // Clean all tables
    const result = await cleanupAllTables()
    
    if (!result.success) {
      return errorResponse(
        result.results[0]?.error ?? 'Cleanup failed',
        500
      )
    }

    return successResponse({
      message: `Cleanup complete: ${result.totalDeleted} total records deleted`,
      ...result,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
