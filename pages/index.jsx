import Head from 'next/head';
import { App } from '../src/main.jsx';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>메디헬퍼스 | 의료인 구인구직·헤드헌팅</title>
        <meta name="description" content="의료인 비공개 구직 상담, 병원 채용공고와 전담 헤드헌팅을 연결하는 메디헬퍼스" />
      </Head>
      <App />
    </>
  );
}
