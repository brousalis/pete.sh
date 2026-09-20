/**
 * Remote MCP server — POST /api/coach/mcp
 *
 * Exposes the coach's read tools to claude.ai and Claude Code, so the same
 * training data can be explored on the Claude subscription without spending
 * API budget. Useful for the long, exploratory "why did my swim plateau"
 * sessions that would otherwise dominate the monthly cost.
 *
 * Read-only by design. An external client cannot alter the plan, log a
 * symptom or write memory: those decisions belong to the coach runtime where
 * the Injury Guard runs, not to a chat window with no guardrails behind it.
 *
 * Transport is Streamable HTTP (JSON-RPC 2.0 over POST), authenticated with
 * the coach bearer key. The proxy already gates /api/coach/*, so a request
 * without the key never reaches this handler.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'

import { createToolDeps } from '@/lib/services/coach/tools.service'
import { READ_TOOL_NAMES } from '@petehome/coach-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const PROTOCOL_VERSION = '2025-06-18'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

function result(id: string | number | null | undefined, payload: unknown): Response {
  return Response.json({ jsonrpc: '2.0', id: id ?? null, result: payload })
}

function rpcError(
  id: string | number | null | undefined,
  code: number,
  message: string
): Response {
  return Response.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })
}

/**
 * Tool schemas for MCP.
 *
 * Declared here as JSON Schema rather than reusing the zod definitions,
 * because MCP clients need plain JSON Schema and converting zod at runtime
 * would add a dependency for one call site.
 */
const TOOL_SCHEMAS: Record<
  string,
  { description: string; inputSchema: Record<string, unknown> }
> = {
  get_athlete_profile: {
    description:
      'Physiology, thresholds, weight band and goal race for the athlete PeteCoach trains.',
    inputSchema: { type: 'object', properties: {} },
  },
  get_injury_status: {
    description:
      'Current injuries with imaging findings, contraindications, clearance conditions and recent symptom logs.',
    inputSchema: { type: 'object', properties: {} },
  },
  query_activities: {
    description:
      'Completed training sessions in a date range, with computed training load, zone distribution and cardiac drift.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'YYYY-MM-DD, defaults to 28 days ago' },
        to: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
        sports: {
          type: 'array',
          items: { type: 'string', enum: ['swim', 'bike', 'run', 'strength', 'walk', 'hiit'] },
        },
        limit: { type: 'number', default: 30 },
      },
    },
  },
  get_activity_detail: {
    description: 'Full analysis of one session including splits and swim lengths.',
    inputSchema: {
      type: 'object',
      properties: { activityId: { type: 'string' } },
      required: ['activityId'],
    },
  },
  get_daily_metrics: {
    description:
      'Daily health metrics: HRV, resting heart rate, sleep with stages, respiratory rate, weight and body composition.',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', default: 14 } },
    },
  },
  get_training_load: {
    description: 'CTL, ATL, TSB, ACWR, monotony and weekly load by sport.',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', default: 90 } },
    },
  },
  get_readiness: {
    description: 'Readiness score with component breakdown, flags and the recommended response.',
    inputSchema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'YYYY-MM-DD' } },
    },
  },
  get_plan: {
    description: 'Scheduled sessions in a date range with their rationale.',
    inputSchema: {
      type: 'object',
      properties: { from: { type: 'string' }, to: { type: 'string' } },
      required: ['from', 'to'],
    },
  },
  recall: {
    description: 'Search stored memories about the athlete.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, limit: { type: 'number', default: 8 } },
      required: ['query'],
    },
  },
  search_knowledge: {
    description:
      'Search the training science library and the athlete\'s medical notes. Returns passages with citations.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, limit: { type: 'number', default: 6 } },
      required: ['query'],
    },
  },
  search_pubmed: {
    description: 'Search PubMed for current research.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, limit: { type: 'number', default: 5 } },
      required: ['query'],
    },
  },
  get_weather: {
    description: 'Chicago forecast including wind, air quality and daylight.',
    inputSchema: { type: 'object', properties: { date: { type: 'string' } } },
  },
  get_lake_conditions: {
    description: 'Lake Michigan water temperature and wetsuit legality.',
    inputSchema: { type: 'object', properties: {} },
  },
  project_race: {
    description:
      'Projected finish against the sub-3 split budget, with per-discipline leverage weighed against knee risk.',
    inputSchema: { type: 'object', properties: {} },
  },
  compute_zones: {
    description: 'Current heart rate, pace and swim zones.',
    inputSchema: { type: 'object', properties: {} },
  },
  get_benchmarks: {
    description:
      'Benchmark history: CSS, FTP, run time trials and the quad symmetry tests that gate run intensity.',
    inputSchema: {
      type: 'object',
      properties: { testType: { type: 'string' } },
    },
  },
  get_gear: {
    description: 'Gear inventory with accumulated mileage.',
    inputSchema: { type: 'object', properties: {} },
  },
  get_nutrition_targets: {
    description: 'Fuelling targets for a date, periodised to that day\'s training load.',
    inputSchema: { type: 'object', properties: { date: { type: 'string' } } },
  },
  get_pt_protocol: {
    description: 'Prescribed physical therapy blocks with exercises and completion status.',
    inputSchema: { type: 'object', properties: {} },
  },
}

const EXPOSED_TOOLS = READ_TOOL_NAMES.filter((name) => name in TOOL_SCHEMAS)

export async function POST(request: NextRequest) {
  let body: JsonRpcRequest

  try {
    body = (await request.json()) as JsonRpcRequest
  } catch {
    return rpcError(null, -32700, 'Parse error')
  }

  const { id, method, params } = body

  try {
    switch (method) {
      case 'initialize':
        return result(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: 'petecoach',
            version: '1.0.0',
            // Stated in the handshake so the client surfaces it to the user.
            instructions:
              'Read-only access to PeteCoach training data: activities, health metrics, training load, the plan, injury record and knowledge base. Plan changes and symptom logging are intentionally unavailable here — those run through the coach where the Injury Guard validates them.',
          },
        })

      // Notifications carry no id and expect no response body.
      case 'notifications/initialized':
        return new Response(null, { status: 202 })

      case 'ping':
        return result(id, {})

      case 'tools/list':
        return result(id, {
          tools: EXPOSED_TOOLS.map((name) => ({
            name,
            description: TOOL_SCHEMAS[name]!.description,
            inputSchema: TOOL_SCHEMAS[name]!.inputSchema,
            annotations: { readOnlyHint: true, openWorldHint: name === 'search_pubmed' },
          })),
        })

      case 'tools/call': {
        const parsed = z
          .object({ name: z.string(), arguments: z.record(z.unknown()).optional() })
          .safeParse(params)

        if (!parsed.success) {
          return rpcError(id, -32602, 'Invalid tool call parameters')
        }

        const { name, arguments: args } = parsed.data

        if (!EXPOSED_TOOLS.includes(name as (typeof EXPOSED_TOOLS)[number])) {
          return rpcError(
            id,
            -32601,
            `Unknown or write-restricted tool: ${name}. This endpoint is read-only.`
          )
        }

        const deps = createToolDeps()
        const output = await callTool(deps, name, args ?? {})

        return result(id, {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        })
      }

      default:
        return rpcError(id, -32601, `Method not found: ${method}`)
    }
  } catch (error) {
    console.error('[coach][mcp] Request failed:', error)
    return rpcError(id, -32603, error instanceof Error ? error.message : 'Internal error')
  }
}

/** Route a tool name to its implementation. */
async function callTool(
  deps: ReturnType<typeof createToolDeps>,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'get_athlete_profile':
      return deps.getAthleteProfile()
    case 'get_injury_status':
      return deps.getInjuryStatus()
    case 'query_activities':
      return deps.queryActivities(args as Parameters<typeof deps.queryActivities>[0])
    case 'get_activity_detail':
      return deps.getActivityDetail(String(args.activityId))
    case 'get_daily_metrics':
      return deps.getDailyMetrics({ days: Number(args.days ?? 14) })
    case 'get_training_load':
      return deps.getTrainingLoad({ days: Number(args.days ?? 90) })
    case 'get_readiness':
      return deps.getReadiness({ date: args.date as string | undefined })
    case 'get_plan':
      return deps.getPlan({ from: String(args.from), to: String(args.to) })
    case 'recall':
      return deps.recall({ query: String(args.query), limit: Number(args.limit ?? 8) })
    case 'search_knowledge':
      return deps.searchKnowledge({ query: String(args.query), limit: Number(args.limit ?? 6) })
    case 'search_pubmed':
      return deps.searchPubmed({ query: String(args.query), limit: Number(args.limit ?? 5) })
    case 'get_weather':
      return deps.getWeather({ date: args.date as string | undefined })
    case 'get_lake_conditions':
      return deps.getLakeConditions()
    case 'project_race':
      return deps.projectRace()
    case 'compute_zones':
      return deps.computeZones()
    case 'get_benchmarks':
      return deps.getBenchmarks({ testType: args.testType as string | undefined })
    case 'get_gear':
      return deps.getGear()
    case 'get_nutrition_targets':
      return deps.getNutritionTargets({ date: args.date as string | undefined })
    case 'get_pt_protocol':
      return deps.getPtProtocol()
    default:
      throw new Error(`Unhandled tool: ${name}`)
  }
}

/** Advertise the endpoint to clients that probe with GET. */
export async function GET() {
  return Response.json({
    name: 'petecoach',
    version: '1.0.0',
    protocolVersion: PROTOCOL_VERSION,
    transport: 'streamable-http',
    readOnly: true,
    tools: EXPOSED_TOOLS.length,
  })
}
