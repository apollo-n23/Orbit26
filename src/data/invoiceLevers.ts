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
    icon: 'Invoice5sSortIcon.jpg',
    preview: 'Invoice5sSortPreview.jpg',
  },
  {
    id: 'set-in-order',
    term: 'Seiton',
    title: 'Set in Order',
    description:
      'Arrange the invoice form in the same order as the launch-record slip — mission, customer, company, date, reference, amount — so transcription runs top-to-bottom instead of hunting a scrambled field list.',
    icon: 'Invoice5sSetInOrderIcon.jpg',
    preview: 'Invoice5sSetInOrderPreview.jpg',
  },
  {
    id: 'shine',
    term: 'Seiso',
    title: 'Shine',
    description:
      'Clean up the presentation of the launch list — clearer spacing and row separation — so the right record is easy to spot at a glance instead of a dense, uniform wall of text.',
    icon: 'Invoice5sShineIcon.jpg',
    preview: 'Invoice5sShinePreview.jpg',
  },
  {
    id: 'standardize',
    term: 'Seiketsu',
    title: 'Standardize',
    description:
      'Give every invoice field a consistent example format (a placeholder hint) instead of a blank box the learner has to guess the format for each time.',
    icon: 'Invoice5sStandardizeIcon.jpg',
    preview: 'Invoice5sStandardizePreview.jpg',
  },
  {
    id: 'sustain',
    term: 'Shitsuke',
    title: 'Sustain',
    description:
      'The discipline to keep the full 5S system in place — turning Sustain on enables Sort, Set in Order, Shine, and Standardize together, and turning any of those four off drops Sustain with it.',
    icon: 'Invoice5sSustainIcon.jpg',
    preview: 'Invoice5sSustainPreview.jpg',
  },
]
