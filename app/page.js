export default function Home() {
  return (
    <section className="card-area">
      <h1>TFG Team12 Frontend</h1>
      <p>Next.js 기본 화면 뼈대만 구성했습니다.</p>
      <div className="grid">
        <article className="card">
          <h2>Hero Section</h2>
          <p>서비스 소개 영역입니다.</p>
        </article>
        <article className="card">
          <h2>Feature One</h2>
          <p>원하는 기능을 이곳에 추가하세요.</p>
        </article>
        <article className="card">
          <h2>Feature Two</h2>
          <p>컴포넌트/페이지를 이 템플릿 기반으로 확장합니다.</p>
        </article>
      </div>
    </section>
  );
}
