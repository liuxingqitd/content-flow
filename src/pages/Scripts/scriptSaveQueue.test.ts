import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearScriptSaveQueuesForTests, enqueueScriptSave, waitForScriptSaves } from './scriptSaveQueue'

const deferred = () => {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

describe('per-script save queue', () => {
  beforeEach(clearScriptSaveQueuesForTests)

  it('does not let one blocked script delay another script', async () => {
    const blocked = deferred()
    const saveA = enqueueScriptSave('script_a', () => blocked.promise)
    const saveBTask = vi.fn(async () => undefined)

    await enqueueScriptSave('script_b', saveBTask)

    expect(saveBTask).toHaveBeenCalledOnce()
    blocked.resolve()
    await saveA
  })

  it('keeps same-script saves ordered and recovers after a rejection', async () => {
    const first = deferred()
    const order: string[] = []
    const firstSave = enqueueScriptSave('script_a', async () => {
      order.push('first:start')
      await first.promise
      order.push('first:end')
    })
    const secondSave = enqueueScriptSave('script_a', async () => { order.push('second') })

    await Promise.resolve()
    expect(order).toEqual(['first:start'])
    first.resolve()
    await Promise.all([firstSave, secondSave])
    expect(order).toEqual(['first:start', 'first:end', 'second'])

    const failed = enqueueScriptSave('script_a', async () => { throw new Error('save failed') })
    await expect(failed).rejects.toThrow('save failed')
    await expect(enqueueScriptSave('script_a', async () => { order.push('recovered') })).resolves.toBeUndefined()
    await waitForScriptSaves('script_a')
    expect(order.at(-1)).toBe('recovered')
  })
})
