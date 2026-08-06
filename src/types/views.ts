export type AppView = 'simulation' | 'data' | 'comparison'

export const APP_VIEWS: { id: AppView; label: string }[] = [
  { id: 'simulation', label: 'Simulation' },
  { id: 'data', label: 'Data' },
  { id: 'comparison', label: 'Comparison' },
]
