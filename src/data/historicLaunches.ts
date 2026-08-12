import type { HistoricLaunch } from '../types/invoice'

/**
 * Static, fictional billing records for the invoicing exercise — deliberately
 * not derived from the Data board's live LeadTimeEntry log, so this module
 * has something to work with even on a fresh session and never depends on
 * (or feeds back into) the rocket-launch process. Customer companies reuse
 * the Customer Portal's cast for narrative consistency.
 */
export const HISTORIC_LAUNCHES: HistoricLaunch[] = [
  {
    id: 'launch-nimbuslink-07',
    customerName: 'Priya Anand',
    customerCompany: 'NimbusLink',
    missionName: 'NimbusLink Relay-7',
    launchDate: '2026-01-12',
    heightAchievedMiles: 74,
    amountDueUsd: 186400,
    reference: 'ORB-1042',
    internalNote: 'Pallet from dock 3 still needs to go back to the yard.',
  },
  {
    id: 'launch-ironhold-recon',
    customerName: 'Marcus Ferro',
    customerCompany: 'Ironhold',
    missionName: 'Ironhold Recon Sat',
    launchDate: '2026-01-19',
    heightAchievedMiles: 68,
    amountDueUsd: 214900,
    reference: 'ORB-1047',
    internalNote: 'Ask Jan about the parking validation from last visit.',
  },
  {
    id: 'launch-halcyon-array',
    customerName: 'Dr. Elena Vosk',
    customerCompany: 'Halcyon',
    missionName: 'Halcyon Research Array II',
    launchDate: '2026-02-02',
    heightAchievedMiles: 81,
    amountDueUsd: 241750,
    reference: 'ORB-1053',
    internalNote: 'Break room coffee machine still broken — flag to facilities.',
  },
  {
    id: 'launch-aegis-sentry',
    customerName: 'Tom Whitcombe',
    customerCompany: 'Aegis Orbital Logistics',
    missionName: 'Aegis Sentry-3',
    launchDate: '2026-02-09',
    heightAchievedMiles: 77,
    amountDueUsd: 198300,
    reference: 'ORB-1058',
    internalNote: 'Remember to badge out visitor passes from the tour group.',
  },
  {
    id: 'launch-lumen-node',
    customerName: 'Sasha Okoro',
    customerCompany: 'Lumen Constellation',
    missionName: 'Lumen Node 12',
    launchDate: '2026-02-16',
    heightAchievedMiles: 72,
    amountDueUsd: 176900,
    reference: 'ORB-1064',
    internalNote: 'Double-check the loading dock schedule for next Tuesday.',
  },
  {
    id: 'launch-continental-uplink',
    customerName: 'Rosa Delgado',
    customerCompany: 'Continental',
    missionName: 'Continental Uplink-4',
    launchDate: '2026-02-21',
    heightAchievedMiles: 85,
    amountDueUsd: 229100,
    reference: 'ORB-1069',
    internalNote: 'Spare hard hats are running low in the site office.',
  },
]
