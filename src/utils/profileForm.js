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

export function profileAsSajuForm(profile) {
  return {
    name: profile.name,
    birthDate: profile.birth_date,
    birthTime: formatBirthTime(profile.birth_time),
    gender: profile.gender,
    calendarType: profile.calendar_type,
  }
}
