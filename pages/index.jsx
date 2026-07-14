import Head from 'next/head';
import { App } from '../src/main.jsx';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>메디헬퍼스 | 의료 커리어의 좋은 연결</title>
        <meta name="description" content="의료인을 위한 전문 채용·헤드헌팅 플랫폼 메디헬퍼스" />
      </Head>
      <App />
    </>
  );
}
