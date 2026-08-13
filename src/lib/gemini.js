import { GoogleGenAI } from '@google/genai'
import { SAJU_SYSTEM_PROMPT } from './sajuPrompt.js'

// .env 파일의 VITE_GEMINI_API_KEY를 읽어 옵니다.
// Vite에서는 import.meta.env.VITE_이름 으로 환경 변수에 접근합니다.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY

// Gemini 클라이언트 생성
const ai = new GoogleGenAI({ apiKey })

/**
 * 사용자가 입력한 정보로 사주 해석을 요청합니다. (스트리밍)
 * @param {{ name: string, birthDate: string, birthTime: string, gender: string, calendarType: string }} form
 * @param {(text: string) => void} [onChunk] 글자가 생성될 때마다 지금까지 받은 전체 텍스트를 전달
 * @returns {Promise<string>} 해석 결과 텍스트
 */
export async function askSajuInterpretation(form, onChunk) {
  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY가 없습니다. .env 파일을 확인하고 개발 서버를 다시 시작해 주세요.',
    )
  }

  const genderLabel =
    form.gender === 'male' ? '남자' : form.gender === 'female' ? '여자' : '미선택'
  const calendarLabel = form.calendarType === 'lunar' ? '음력' : '양력'

  // 모델에게 보낼 사용자 메시지 (입력값을 모아 전달)
  const userInput = `
아래 정보를 가진 사람의 사주 기본 차트를 추정하고 해석해 주세요.

- 이름: ${form.name || '미입력'}
- 생년월일: ${form.birthDate || '미입력'}
- 태어난 시간: ${form.birthTime || '모름'}
- 성별: ${genderLabel}
- 달력: ${calendarLabel}
`.trim()

  // stream: true → 글자가 나오는 대로 이벤트를 받습니다.
  const stream = await ai.interactions.create({
    model: 'gemini-3.6-flash',
    system_instruction: SAJU_SYSTEM_PROMPT,
    input: userInput,
    stream: true,
  })

  let fullText = ''

  for await (const event of stream) {
    // step.delta + text 타입일 때만 실제 본문 조각입니다.
    if (event.event_type === 'step.delta' && event.delta?.type === 'text') {
      fullText += event.delta.text
      // 화면에 실시간으로 보여 주기 위해 콜백 호출
      onChunk?.(fullText)
    }
  }

  const text = fullText.trim()
  if (!text) {
    throw new Error('Gemini 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.')
  }

  return text
}
