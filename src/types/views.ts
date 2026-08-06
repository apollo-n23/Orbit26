export type AppView = 'simulation' | 'data'

export const APP_VIEWS: { id: AppView; label: string }[] = [
  { id: 'simulation', label: 'Simulation' },
  { id: 'data', label: 'Data' },
]
