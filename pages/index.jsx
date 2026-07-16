import Head from 'next/head';
import { App } from '../src/main.jsx';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>메디헬퍼스 | 의사 구인구직·전문 헤드헌팅</title>
        <meta name="description" content="의사 비공개 이직 상담과 병원 의사 초빙을 연결하는 의사 전문 헤드헌팅 메디헬퍼스" />
      </Head>
      <App />
    </>
  );
}
