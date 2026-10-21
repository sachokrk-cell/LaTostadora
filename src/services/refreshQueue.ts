// Serializa las lecturas: los cambios llegados durante una carga se agrupan
// para una segunda lectura, en vez de abrir cargas completas superpuestas.
export function createRefreshQueue<Key extends string>(run: (keys: Key[]) => Promise<void>) {
  const pending = new Set<Key>();
  let waiting: { resolve: () => void; reject: (error: unknown) => void }[] = [];
  let running = false;

  async function drain() {
    if (running) return;
    running = true;
    try {
      while (pending.size) {
        const keys = [...pending];
        const listeners = waiting;
        pending.clear();
        waiting = [];
        try {
          await run(keys);
          listeners.forEach(listener => listener.resolve());
        } catch (error) {
          listeners.forEach(listener => listener.reject(error));
        }
      }
    } finally {
      running = false;
    }
  }

  return (keys: readonly Key[]) => {
    if (keys.length === 0) return Promise.resolve();
    keys.forEach(key => pending.add(key));
    const done = new Promise<void>((resolve, reject) => { waiting.push({ resolve, reject }); });
    void drain();
    return done;
  };
}
