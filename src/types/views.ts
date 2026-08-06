export type AppView = 'simulation' | 'map' | 'comparison'

export const APP_VIEWS: { id: AppView; label: string }[] = [
  { id: 'simulation', label: 'Simulation' },
  { id: 'map', label: 'Map' },
  { id: 'comparison', label: 'Comparison' },
]
