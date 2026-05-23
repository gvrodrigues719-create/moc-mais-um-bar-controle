'use client'

import { AreaStatus, AREA_STATUS_LABELS, CountStatus, COUNT_STATUS_LABELS } from '@/lib/types'

type Props =
  | { variant: 'area'; status: AreaStatus }
  | { variant: 'count'; status: CountStatus }

const AREA_STYLES: Record<AreaStatus, string> = {
  pending: 'border border-gray-200 text-gray-400 bg-transparent',
  in_progress: 'bg-amber-50/70 text-amber-700 border border-amber-200/50',
  completed: 'bg-green-50/70 text-green-700 border border-green-200/50',
}

const COUNT_STYLES: Record<CountStatus, string> = {
  not_started: 'border border-gray-200 text-gray-400 bg-transparent uppercase tracking-wider',
  in_progress: 'bg-amber-50/70 text-amber-700 border border-amber-200/50 uppercase tracking-wider',
  completed: 'bg-green-50/70 text-green-700 border border-green-200/50 uppercase tracking-wider',
  cancelled: 'bg-red-50/70 text-red-500 border border-red-200/50 uppercase tracking-wider',
}

export default function StatusBadge(props: Props) {
  if (props.variant === 'area') {
    return (
      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${AREA_STYLES[props.status]}`}>
        {AREA_STATUS_LABELS[props.status]}
      </span>
    )
  }
  return (
    <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${COUNT_STYLES[props.status]}`}>
      {COUNT_STATUS_LABELS[props.status]}
    </span>
  )
}
