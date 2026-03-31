export const STANDARD_DATE_FORMAT = 'YYYY-MM-DD'

export const STANDARD_DATE_PICKER_PROPS = {
  format: STANDARD_DATE_FORMAT,
  valueFormat: STANDARD_DATE_FORMAT,
  editable: false,
  clearable: false,
  placeholder: '请选择日期',
} as const

export const STANDARD_DATE_RANGE_PICKER_PROPS = {
  format: STANDARD_DATE_FORMAT,
  valueFormat: STANDARD_DATE_FORMAT,
  editable: false,
  clearable: true,
  unlinkPanels: true,
  rangeSeparator: '至',
  startPlaceholder: '开始日期',
  endPlaceholder: '结束日期',
} as const

export function disableFutureDates(date: Date): boolean {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date.getTime() > today.getTime()
}
