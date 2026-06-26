import { config } from 'dotenv'
import { join } from 'path'

config({ path: join(process.cwd(), '.env') })

import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import { handleCopilotRequest } from './copilot/runtime'
import { validateProviderConfig } from './copilot/providerConfig'

const app = express()
const PORT = Number(process.env.PORT || 3001)
const HOST = process.env.HOST || '127.0.0.1'

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      /^https?:\/\/tauri\.localhost(?::\d+)?$/.test(origin) ||
      origin === 'tauri://localhost'
    ) {
      callback(null, true)
      return
    }
    callback(new Error('不允许的请求来源'))
  },
}))
app.all('/api/copilotkit/*splat', handleCopilotRequest)
app.use(express.json({ limit: '1mb' }))

app.post('/api/ai-provider/test', async (req, res) => {
  const { baseUrl, apiKey, model } = req.body as { baseUrl?: string; apiKey?: string; model?: string }
  try {
    const config = validateProviderConfig({ baseURL: baseUrl, apiKey, model })
    const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })
    await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: '只回复 OK' }],
      max_tokens: 8,
      temperature: 0,
    })
    res.json({ message: '模型连接成功' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '模型连接失败'
    res.status(400).json({ error: message })
  }
})

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  void _next
  const message = error instanceof Error ? error.message : '请求失败'
  res.status(message === '不允许的请求来源' ? 403 : 500).json({ error: message })
})

app.listen(PORT, HOST, () => {
  console.log(`[server] ContentFlow API 运行在 http://${HOST}:${PORT}`)
})
