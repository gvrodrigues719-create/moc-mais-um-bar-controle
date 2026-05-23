'use client'

import { AreaStatus, AREA_STATUS_LABELS, CountStatus, COUNT_STATUS_LABELS } from '@/lib/types'

type Props =
  | { variant: 'area'; status: AreaStatus }
  | { variant: 'count'; status: CountStatus }

const AREA_STYLES: Record<AreaStatus, string> = {
  pending: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
}

const COUNT_STYLES: Record<CountStatus, string> = {
  not_started: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
}

export default function StatusBadge(props: Props) {
  if (props.variant === 'area') {
    return (
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${AREA_STYLES[props.status]}`}>
        {AREA_STATUS_LABELS[props.status]}
      </span>
    )
  }
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${COUNT_STYLES[props.status]}`}>
      {COUNT_STATUS_LABELS[props.status]}
    </span>
  )
}
