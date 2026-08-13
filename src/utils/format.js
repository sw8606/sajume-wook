export function genderLabel(gender) {
  if (gender === 'male') return '남자'
  if (gender === 'female') return '여자'
  return ''
}

export function calendarLabel(calendarType) {
  if (calendarType === 'lunar') return '음력'
  if (calendarType === 'solar') return '양력'
  return ''
}

export function formatBirthDate(date) {
  if (!date) return ''
  return String(date).replaceAll('-', '. ')
}

export function formatBirthTime(time) {
  if (!time) return ''
  return String(time).slice(0, 5)
}

export function formatReadingDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}. ${m}. ${day} ${h}:${min}`
}

export function normalizeResult(text) {
  return (text ?? '').replaceAll('\\n', '\n').trim()
}

export function profileMeta(profile) {
  if (!profile) return ''
  return [
    calendarLabel(profile.calendar_type),
    formatBirthDate(profile.birth_date),
    formatBirthTime(profile.birth_time) || '시간 모름',
    genderLabel(profile.gender),
  ]
    .filter(Boolean)
    .join(' · ')
}

export function formMeta(form) {
  if (!form) return ''
  return profileMeta({
    calendar_type: form.calendarType,
    birth_date: form.birthDate,
    birth_time: form.birthTime,
    gender: form.gender,
  })
}
