import { formatBirthTime } from './format.js'

export function emptyProfileForm() {
  return {
    name: '',
    birthDate: '',
    birthTime: '',
    gender: '',
    calendarType: 'solar',
  }
}

export function profileToForm(profile) {
  if (!profile) return emptyProfileForm()
  return {
    name: profile.name ?? '',
    birthDate: profile.birth_date ?? '',
    birthTime: formatBirthTime(profile.birth_time),
    gender: profile.gender ?? '',
    calendarType: profile.calendar_type ?? 'solar',
  }
}

export function validateProfileForm(form) {
  if (!form.name.trim() || !form.birthDate || !form.gender) {
    return '이름, 생년월일, 성별은 꼭 입력해 주세요.'
  }
  return ''
}

export function readingAsSajuForm(reading) {
  return {
    name: reading.name,
    birthDate: reading.birth_date,
    birthTime: formatBirthTime(reading.birth_time),
    gender: reading.gender,
    calendarType: reading.calendar_type,
  }
}

export function formAsSajuForm(form) {
  return {
    name: form.name.trim(),
    birthDate: form.birthDate,
    birthTime: form.birthTime,
    gender: form.gender,
    calendarType: form.calendarType,
  }
}

/** 사주 기록 insert용 대상자 스냅샷 */
export function formToReadingSubject(form) {
  return {
    name: form.name.trim(),
    birth_date: form.birthDate,
    birth_time: form.birthTime || null,
    gender: form.gender,
    calendar_type: form.calendarType,
  }
}
