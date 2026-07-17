import React from 'react';
import { Mail, Phone, ShieldCheck } from 'lucide-react';
import { withBase } from './basePath.js';

const operator = {
  name: '메디헬퍼스',
  representative: '이형석',
  businessNumber: '873-92-00515',
  ecommerceNumber: '제2017-부산북구-0345호',
  jobInformationNumber: '부산북부지청 제2017-1호',
  address: '부산광역시 북구 만덕대로116번길 28',
  phone: '051-342-5463',
  fax: '051-342-5465',
  email: 'hr@medihelpers.co.kr',
};

function LegalLayout({ eyebrow, title, description, children }) {
  return <section className="legal-page">
    <header className="legal-hero">
      <span><ShieldCheck /> {eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="legal-effective"><b>시행일</b> 2026년 7월 18일 <i>v1.0</i></div>
    </header>
    <div className="legal-layout">
      <article className="legal-document">{children}</article>
      <aside className="legal-operator">
        <small>운영자 정보</small>
        <h2>{operator.name}</h2>
        <dl>
          <div><dt>대표자</dt><dd>{operator.representative}</dd></div>
          <div><dt>사업자등록번호</dt><dd>{operator.businessNumber}</dd></div>
          <div><dt>통신판매업 신고</dt><dd>{operator.ecommerceNumber}</dd></div>
          <div><dt>직업정보제공사업</dt><dd>{operator.jobInformationNumber}</dd></div>
          <div><dt>소재지</dt><dd>{operator.address}</dd></div>
        </dl>
        <a href={`tel:${operator.phone.replace(/\D/g, '')}`}><Phone /> {operator.phone}</a>
        <a href={`mailto:${operator.email}`}><Mail /> {operator.email}</a>
      </aside>
    </div>
  </section>;
}

const Section = ({ number, title, children }) => <section className="legal-section">
  <h2><span>{number}</span>{title}</h2>
  {children}
</section>;

export function TermsPage() {
  return <LegalLayout eyebrow="SERVICE TERMS" title="서비스 이용약관" description="메디헬퍼스 채용·헤드헌팅 서비스를 이용할 때 적용되는 권리와 책임을 안내합니다.">
    <Section number="01" title="목적과 적용 범위">
      <p>이 약관은 메디헬퍼스가 제공하는 의사·의료인 채용정보, 인재정보, 비공개 이직상담, 병원 채용의뢰, 광고 및 관련 관리 서비스의 이용 조건과 회사와 회원의 권리·의무를 정합니다. 개별 서비스 화면에서 별도로 안내하고 동의받은 조건은 이 약관과 함께 적용됩니다.</p>
    </Section>
    <Section number="02" title="회원가입과 계정">
      <ul>
        <li>회원은 실제 본인 또는 병원·기관으로부터 권한을 받은 담당자여야 하며 정확한 정보를 제공해야 합니다.</li>
        <li>의료인 자격, 병원·기관 또는 담당자 권한 확인이 필요한 기능은 별도 인증을 마친 뒤 사용할 수 있습니다.</li>
        <li>계정 공유, 타인 명의 이용, 허위 기관 등록과 인증자료 위·변조는 금지됩니다.</li>
        <li>회원은 마이페이지 또는 고객센터를 통해 정보 열람·수정과 탈퇴를 요청할 수 있습니다.</li>
      </ul>
    </Section>
    <Section number="03" title="채용정보·인재정보와 상담">
      <p>병원은 사실에 부합하는 공고와 근무조건을 등록해야 하며 변경 시 즉시 수정해야 합니다. 개인 회원은 본인의 경력과 희망조건만 등록할 수 있습니다. 회사는 정확성·적법성 확인을 위해 보완, 공개 보류 또는 증빙 확인을 요청할 수 있습니다.</p>
      <p>후보자의 실명, 연락처, 상세 경력 등 식별 가능한 정보는 후보자의 의사를 확인한 범위에서 병원에 전달합니다. 공개 목록을 통해 얻은 정보를 채용 목적 외로 사용하거나 무단 저장·재배포·영업에 이용해서는 안 됩니다.</p>
    </Section>
    <Section number="04" title="유료 서비스·결제·환불">
      <p>광고, 열람권, 채용상품 등 유료 서비스의 가격, 제공기간, 노출 범위, 이용조건과 환불조건은 신청·결제 화면에서 계약 전에 표시합니다. 이용자는 결제 전에 해당 조건을 확인하고 동의해야 합니다.</p>
      <p>청약철회와 환불은 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관계 법령 및 결제 당시 고지한 조건에 따릅니다. 서비스 제공이 시작되었거나 이용자가 제공기간 중 일부를 사용한 경우 관계 법령이 허용하는 범위에서 사용분이 공제될 수 있으며, 제한 사유는 결제 전에 별도로 고지합니다.</p>
    </Section>
    <Section number="05" title="금지행위와 이용 제한">
      <ul>
        <li>허위·과장 공고, 차별적이거나 위법한 채용조건의 게시</li>
        <li>개인정보 무단 수집·판매·전달, 스크래핑 및 대량 자동조회</li>
        <li>후보자 동의 없는 제3자 제공 또는 채용 목적 외 이용</li>
        <li>서비스 장애 유발, 보안 우회, 타인의 권리 침해</li>
      </ul>
      <p>위반이 확인되면 게시물 비공개, 기능 제한, 계정 정지 또는 계약 해지가 이루어질 수 있습니다. 긴급한 개인정보 침해나 보안 사고가 아닌 경우 회사는 필요한 범위에서 사유와 이의제기 방법을 안내합니다.</p>
    </Section>
    <Section number="06" title="서비스 변경·중단과 책임">
      <p>회사는 안정적인 운영, 보안, 법령 준수 또는 서비스 개선을 위해 기능을 변경할 수 있으며 중요한 변경은 사전에 알립니다. 천재지변, 통신사업자 장애, 불가피한 점검 등 합리적으로 통제하기 어려운 사유로 서비스가 중단될 수 있습니다.</p>
      <p>회사는 채용 성사 자체를 보증하지 않습니다. 다만 회사의 고의 또는 중대한 과실로 이용자에게 손해가 발생한 경우 관계 법령에 따른 책임을 부담합니다.</p>
    </Section>
    <Section number="07" title="계약 해지와 분쟁">
      <p>회원은 언제든 탈퇴를 요청할 수 있으며, 진행 중인 결제·채용 계약이나 법정 보존 기록은 해당 관계가 종료된 후 정해진 기간 동안 분리 보관됩니다. 분쟁이 발생하면 고객센터를 통해 우선 협의하고, 해결되지 않으면 대한민국 법령과 민사소송법상 관할법원에 따릅니다.</p>
    </Section>
    <Section number="08" title="약관 변경과 문의">
      <p>회사는 약관을 변경할 경우 시행일과 변경 이유를 사이트에 게시합니다. 이용자에게 불리한 중요한 변경은 원칙적으로 시행 30일 전에 알리고, 그 밖의 변경은 7일 전에 알립니다.</p>
      <p>문의: <a href={`mailto:${operator.email}`}>{operator.email}</a> · <a href={`tel:${operator.phone.replace(/\D/g, '')}`}>{operator.phone}</a></p>
    </Section>
  </LegalLayout>;
}

export function PrivacyPolicyPage() {
  return <LegalLayout eyebrow="PRIVACY POLICY" title="개인정보처리방침" description="메디헬퍼스가 실제 서비스에서 처리하는 개인정보와 보호 기준을 공개합니다.">
    <Section number="01" title="처리 목적과 항목">
      <div className="legal-table">
        <div><b>회원·계정</b><span>회원 식별, 본인확인, 계정 보안, 권한 제공</span><span>이름, 이메일, 휴대폰 번호, 회원 유형, 동의 일시·버전</span></div>
        <div><b>개인 회원</b><span>맞춤 채용정보, 이력서·상담 관리</span><span>의료 직군, 전문 분야, 활동 지역, 선택 입력한 경력·희망조건</span></div>
        <div><b>병원 회원</b><span>기관 확인, 공고·채용의뢰·결제 관리</span><span>담당자명·직책, 병원명, 기관 유형, 대표자명, 대표전화, 주소</span></div>
        <div><b>상담·문의</b><span>상담 접수, 후보 추천, 면접·조건 조율</span><span>이름, 연락처, 이메일, 진료과·직군, 희망조건, 문의내용</span></div>
        <div><b>결제·계약</b><span>상품 제공, 결제 확인, 환불·분쟁 처리</span><span>회원·기관 식별정보, 상품, 금액, 결제수단, 승인·환불 상태와 일시</span></div>
      </div>
      <p>서비스 이용 과정에서 접속 일시, IP 주소, 브라우저 정보, 오류·보안 로그가 자동 생성될 수 있습니다. 주민등록번호와 면허·자격·사업자등록증 원본은 가입 단계에서 수집하지 않습니다.</p>
    </Section>
    <Section number="02" title="보유 및 이용 기간">
      <ul>
        <li>회원정보: 회원 탈퇴 시까지</li>
        <li>상담·채용 연결 기록: 상담 또는 채용 건 종료 후 3년</li>
        <li>계약 또는 청약철회 등에 관한 기록, 대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
        <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
        <li>표시·광고에 관한 기록: 6개월</li>
      </ul>
      <p>관계 법령에 따른 보존기간이 끝나거나 처리 목적이 달성되면 지체 없이 파기합니다. 법정 보존이 필요한 정보는 다른 정보와 분리하여 해당 목적으로만 보관합니다.</p>
    </Section>
    <Section number="03" title="제3자 제공">
      <p>메디헬퍼스는 원칙적으로 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 후보자를 병원에 소개할 때에는 후보자에게 제공받는 병원, 제공 목적, 제공 항목, 보유기간과 거부권을 건별로 알리고 별도 동의를 받은 범위에서만 제공합니다.</p>
      <p>법률에 특별한 규정이 있거나 생명·신체의 급박한 보호 등 「개인정보 보호법」이 허용하는 경우에는 법이 정한 범위에서 처리할 수 있습니다.</p>
    </Section>
    <Section number="04" title="처리업무 위탁과 인프라">
      <p>서비스 운영을 위해 홈페이지 호스팅·인증·데이터베이스 인프라 제공자에게 필요한 범위의 처리를 맡길 수 있습니다. 실제 이용 중인 수탁자와 업무 내용은 변경 시 이 방침에 공개하고, 계약을 통해 보호조치와 재위탁 제한을 관리합니다.</p>
      <div className="legal-table compact">
        <div><b>OpenAI Sites 및 연결 인프라</b><span>웹사이트 호스팅, 인증 헤더 전달, 서버 기능 운영</span><span>계약 또는 서비스 이용 종료 시까지</span></div>
        <div><b>Cloudflare</b><span>데이터베이스·보안 인프라 운영</span><span>계약 또는 서비스 이용 종료 시까지</span></div>
      </div>
      <p>이메일·문자 알림 또는 결제 기능을 정식 연결할 때에는 해당 수탁자와 처리 항목을 서비스 적용 전에 이 방침에 추가합니다.</p>
    </Section>
    <Section number="05" title="파기 절차와 방법">
      <p>보유기간이 끝난 전자정보는 복구하기 어려운 방법으로 삭제하고, 출력물은 분쇄 또는 소각합니다. 법령에 따라 별도 보관하는 정보는 접근권한을 최소화하고 일반 서비스 데이터와 논리적으로 분리합니다.</p>
    </Section>
    <Section number="06" title="정보주체의 권리">
      <p>이용자는 본인의 개인정보 열람, 정정·삭제, 처리정지, 동의 철회와 회원 탈퇴를 요청할 수 있습니다. 마이페이지 또는 아래 개인정보 보호책임자에게 요청하면 본인확인 후 관계 법령이 정한 기간 안에 처리 결과를 안내합니다. 법정대리인은 만 14세 미만 아동의 권리를 행사할 수 있으나, 메디헬퍼스 회원 서비스는 만 14세 이상만 가입할 수 있습니다.</p>
    </Section>
    <Section number="07" title="안전성 확보조치">
      <ul>
        <li>역할에 따른 접근권한 부여와 관리자 접근 기록 관리</li>
        <li>전송구간 암호화, 비밀번호를 직접 수집하지 않는 외부 인증 방식</li>
        <li>후보자 실명·연락처의 동의 기반 공개와 감사 기록</li>
        <li>보안 업데이트, 취약점 점검, 백업 및 사고 대응 절차</li>
      </ul>
    </Section>
    <Section number="08" title="쿠키와 브라우저 저장정보">
      <p>로그인 상태 유지, 관심공고, 화면 설정 등 편의 기능을 위해 쿠키 또는 브라우저 저장공간을 사용할 수 있습니다. 브라우저 설정에서 저장을 거부하거나 삭제할 수 있으나 일부 로그인·개인화 기능이 제한될 수 있습니다.</p>
    </Section>
    <Section number="09" title="개인정보 보호책임자와 구제">
      <dl className="legal-contact-list">
        <div><dt>개인정보 보호책임자</dt><dd>이형석</dd></div>
        <div><dt>이메일</dt><dd><a href={`mailto:${operator.email}`}>{operator.email}</a></dd></div>
        <div><dt>전화</dt><dd><a href={`tel:${operator.phone.replace(/\D/g, '')}`}>{operator.phone}</a></dd></div>
        <div><dt>주소</dt><dd>{operator.address}</dd></div>
      </dl>
      <p>개인정보 침해 상담은 개인정보침해신고센터(국번 없이 118), 개인정보분쟁조정위원회(1833-6972)에도 요청할 수 있습니다.</p>
    </Section>
    <Section number="10" title="방침 변경">
      <p>이 방침을 변경하면 시행일과 변경 내용을 사이트에 게시합니다. 권리 또는 의무에 중요한 변경은 원칙적으로 시행 30일 전에, 그 밖의 변경은 7일 전에 알립니다. 이전 방침은 요청 시 이메일로 제공받을 수 있습니다.</p>
      <p><a href={withBase('/terms')}>서비스 이용약관 보기</a></p>
    </Section>
  </LegalLayout>;
}
