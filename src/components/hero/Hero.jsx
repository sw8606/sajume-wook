export default function Hero({ isGuest, readingCount }) {
  return (
    <header className="hero">
      <p className="brand">사주미</p>
      <h1>나를 담은 사주 보기</h1>
      <p className="hero__lead">
        {isGuest
          ? '로그인 없이 바로 사주를 볼 수 있어요. 전체 해석은 로그인 후 열려요.'
          : '프로필에 저장된 정보로 오늘의 나를 차분히 풀어 드립니다.'}
      </p>
      {readingCount != null && readingCount > 0 && (
        <p className="hero__stat">
          총 <span>{readingCount.toLocaleString('ko-KR')}</span>개의 사주가 생성되었습니다
        </p>
      )}
    </header>
  )
}
