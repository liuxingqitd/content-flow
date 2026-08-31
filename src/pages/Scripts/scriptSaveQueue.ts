type SaveTask = () => Promise<void>

const scriptSaveTails = new Map<string, Promise<void>>()

export function enqueueScriptSave(scriptId: string, task: SaveTask): Promise<void> {
  const previous = scriptSaveTails.get(scriptId) ?? Promise.resolve()
  const operation = previous.then(task)
  const tail = operation.catch(() => undefined)
  scriptSaveTails.set(scriptId, tail)
  void tail.then(() => {
    if (scriptSaveTails.get(scriptId) === tail) scriptSaveTails.delete(scriptId)
  })
  return operation
}

export function waitForScriptSaves(scriptId: string): Promise<void> {
  return scriptSaveTails.get(scriptId) ?? Promise.resolve()
}

export function clearScriptSaveQueuesForTests(): void {
  scriptSaveTails.clear()
}
