import type { InvoiceLever } from '../types/invoice'

/**
 * 5S improvement options for the invoicing process. Deliberately separate
 * from `lib/redesignCost.ts` — these are free (no point cost, no budget) and
 * never touch the rocket-launch redesign or its ProcessVersion.
 */
export const INVOICE_LEVERS: InvoiceLever[] = [
  {
    id: 'sort',
    term: 'Seiri',
    title: 'Sort',
    description:
      'Remove what the invoice doesn’t need. Each launch record carries an internal note that has nothing to do with billing — Sort hides it from the list and the record card so only billing-relevant fields are in view.',
  },
  {
    id: 'set-in-order',
    term: 'Seiton',
    title: 'Set in Order',
    description:
      'Arrange the invoice form in the order billing actually happens — reference, then customer, then mission, then date, then amount — instead of a scrambled field order the learner has to hunt through.',
  },
  {
    id: 'shine',
    term: 'Seiso',
    title: 'Shine',
    description:
      'Clean up the presentation of the launch list — clearer spacing and row separation — so the right record is easy to spot at a glance instead of a dense, uniform wall of text.',
  },
  {
    id: 'standardize',
    term: 'Seiketsu',
    title: 'Standardize',
    description:
      'Give every invoice field a consistent example format (a placeholder hint) instead of a blank box the learner has to guess the format for each time.',
  },
  {
    id: 'sustain',
    term: 'Shitsuke',
    title: 'Sustain',
    description:
      'The discipline to keep Sort, Set in Order, Shine, and Standardize in place after the redesign — there’s nothing to switch on here; it’s a reminder that the other four only work if the team keeps doing them.',
  },
]
