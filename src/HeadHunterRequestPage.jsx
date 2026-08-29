import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleCheck,
  FileText,
  Handshake,
  LogIn,
  ShieldCheck,
  Stethoscope,
  UserRoundSearch,
} from "lucide-react";
import { appendStoredRecord } from "./browserStorage.js";
import { withBase } from "./basePath.js";
import { useAccountProfile } from "./useAccountProfile.js";
import ResumeSubmitPicker from "./ResumeSubmitPicker.jsx";

const copy = {
  doctor: {
    eyebrow: "FREE JOB-SEEKING REQUEST",
    title: "의사 선생님 간편 이력서",
    description:
      "필요한 정보와 희망 조건만 남기면 메디헬퍼스 헤드헌터가 빠르게 확인한 뒤 비공개로 연락드립니다.",
    steps: [
      ["상담 접수", "희망 지역·전문과·근무형태 입력"],
      ["맞춤 제안", "조건에 맞는 공개·비공개 공고 안내"],
      ["협상·입사", "면접부터 근무조건 조율까지 지원"],
    ],
  },
  hospital: {
    eyebrow: "FREE HIRING REQUEST",
    title: "의사 초빙 의뢰서",
    description:
      "병원의 채용 조건을 남기면 담당 헤드헌터가 내용을 정리하고 적합한 의사를 매칭해드립니다.",
    steps: [
      ["초빙 의뢰", "진료과·일정·보수조건 입력"],
      ["후보 추천", "적합성 확인 후 동의된 후보 제안"],
      ["면접·채용", "면접과 조건 협상·입사 일정 지원"],
    ],
  },
};

export default function HeadHunterRequestPage({ mode = "doctor", qa, auth }) {
  const isDoctor = mode === "doctor";
  const content = copy[mode];
  const requestContext = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return {
        appliedJobId: params.get("job") || "",
        headhuntPostId: params.get("headhuntPost") || "",
        headhuntPostTitle: params.get("title") || "",
        headhuntPostHospital: params.get("hospital") || "",
        headhuntPostSpecialty: params.get("specialty") || "",
      };
    } catch { return { appliedJobId:"", headhuntPostId:"", headhuntPostTitle:"", headhuntPostHospital:"", headhuntPostSpecialty:"" }; }
  })();
  const { appliedJobId, headhuntPostId, headhuntPostTitle, headhuntPostHospital, headhuntPostSpecialty } = requestContext;
  const isDirectApplication = Boolean(isDoctor && appliedJobId);
  const isHeadhuntPostInquiry = Boolean(isDoctor && headhuntPostId);
  const processSteps = isDirectApplication ? [
    ["지원서 제출", "저장한 이력서와 지원 내용을 선택"],
    ["병원 확인", "공고를 등록한 병원 채용담당자가 확인"],
    ["직접 연락", "면접과 근무조건을 병원과 직접 협의"],
  ] : content.steps;
  const qaAllowed = Boolean(
    qa?.active &&
      (qa.info.capabilities.admin ||
        (isDoctor
          ? qa.info.capabilities.doctor
          : qa.info.capabilities.hospital)),
  );
  const [done, setDone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const accountProfile = useAccountProfile(auth);
  const expectedRole = isDoctor ? 'doctor' : 'hospital';
  const access = qaAllowed || auth?.isAdmin || auth?.role === expectedRole
    ? 'allowed'
    : auth?.status === 'loading' ? 'checking' : 'blocked';
  const signedInWrongRole = auth?.status === 'member' && access === 'blocked';
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    const form = new FormData(event.currentTarget);
    form.delete("privacy");
    const fields = Object.fromEntries(form.entries());
    const linkedResume = isDoctor && selectedResumeId ? { resumeId: selectedResumeId } : {};
    const sourceContext = isHeadhuntPostInquiry
      ? { headhuntPostId, headhuntPostTitle, headhuntPostHospital }
      : isDirectApplication ? { jobId: appliedJobId } : {};
    const payload = { ...sourceContext, ...linkedResume, ...fields };
    try {
      if (qaAllowed) {
        const previewId = `QA-${isDoctor ? "D" : "H"}-${String(Date.now()).slice(-6)}`;
        appendStoredRecord(
          isDoctor
            ? "medihelpers_jobseeker_requests"
            : "medihelpers_hiring_requests",
          {
            id: previewId,
            createdAt: new Date().toISOString(),
            status: "preview",
            preview: true,
            ...payload,
          },
          20,
        );
        setDone(previewId);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      // 공고 지원인데 저장 이력서가 하나도 없으면 현재 입력값으로 비공개 기본 이력서를 먼저 만들고,
      // 생성된 ID를 같은 지원 요청에 즉시 연결한다.
      if (isDoctor && (appliedJobId || headhuntPostId) && !payload.resumeId && resumes.length === 0) {
        const savedResponse = await fetch("/api/resumes", {
          method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: fields.specialty ? `${fields.specialty} 지원 이력서` : "공고 지원 이력서",
            name: fields.name || accountProfile.name || "", phone: fields.phone || accountProfile.phone || "",
            email: fields.email || accountProfile.email || "", profession: fields.professionalType || "의료인",
            specialty: fields.specialty || "", desiredRegions: fields.region || "", completion: 40,
            visibility: "private", createNew: true,
            detail: { workType: fields.workType || "", startTiming: fields.startTiming || "", introduction: fields.message || "" },
          }),
        });
        const saved = await savedResponse.json().catch(() => ({}));
        if (!savedResponse.ok || !saved.id) throw new Error(saved.error || "지원에 사용할 이력서를 저장하지 못했습니다.");
        payload.resumeId = saved.id;
        const createdResume = { id:saved.id, title:fields.specialty ? `${fields.specialty} 지원 이력서` : "공고 지원 이력서", completion:40, visibility:"private" };
        setResumes([createdResume]);
        setSelectedResumeId(saved.id);
      }
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestType: isDoctor ? "doctor" : "hospital", payload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "상담 접수에 실패했습니다.");
      appendStoredRecord(isDoctor ? "medihelpers_jobseeker_requests" : "medihelpers_hiring_requests", { id: result.id, createdAt: new Date().toISOString(), status: "new", ...payload }, 20);
      setDone(result.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmitError(error.message || "잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };
  if (access !== "allowed") {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    return <main className="quick-request-auth-page">
      <div className="quick-auth-backdrop" aria-hidden="true"><span /><span /><span /></div>
      <section className="quick-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="consultation-login-title">
        <div className={`quick-auth-icon ${isDoctor ? "doctor" : "hospital"}`}>{isDoctor ? <Stethoscope /> : <BriefcaseBusiness />}</div>
        <small>MEMBERS ONLY CONSULTATION</small>
          <h1 id="consultation-login-title">{signedInWrongRole ? `현재 회원 유형으로는 ${isDirectApplication ? '공고 지원' : '상담 신청'}을 이용할 수 없어요` : `${isDirectApplication ? "공고 지원" : "상담 신청"}은 로그인 후 이용할 수 있어요`}</h1>
        <p>{signedInWrongRole ? `${isDoctor ? '의료인 회원' : '병원 회원'} 전용 접수 화면입니다. 현재 로그인은 유지되며 다시 로그인하거나 가입할 필요가 없습니다.` : `${isDirectApplication ? "지원 이력과 연락처" : isDoctor ? "이직 조건과 경력 정보" : "병원 채용 조건과 담당자 정보"}를 안전하게 보호하기 위해 로그인한 회원만 접수할 수 있습니다.`}</p>
        {access === "checking" ? <div className="quick-auth-checking">회원 상태를 확인하고 있습니다…</div> : <>
          {signedInWrongRole ? <a className="quick-auth-login" href={withBase(isDoctor ? '/jobs' : '/medical-staff')}><ArrowRight /> 이용 가능한 채용정보로 이동</a> : <>
            <a className="quick-auth-login" href={withBase(`/login?next=${encodeURIComponent(returnTo)}`)}><LogIn /> 로그인하고 상담 계속하기 <ArrowRight /></a>
            <a className="quick-auth-signup" href={withBase(`/signup/${isDoctor ? "doctor" : "hospital"}?next=${encodeURIComponent(returnTo)}`)}>{isDoctor ? "의료인 회원가입" : "병원 회원가입"} 안내 보기</a>
          </>}
        </>}
        <div className="quick-auth-safe"><ShieldCheck /><span><strong>{isDirectApplication ? "지원 내용은 해당 병원에만 전달됩니다" : "상담 내용은 공개되지 않습니다"}</strong><small>{isDirectApplication ? "유료 채용광고 지원은 메디헬퍼스 헤드헌터 상담함으로 전달되지 않습니다." : "회원 확인 후 메디헬퍼스 담당 헤드헌터에게만 안전하게 전달됩니다."}</small></span></div>
      </section>
    </main>;
  }
  if (done)
    return (
      <main className="quick-request-page">
        <section className="quick-request-complete">
          <span>
            <CircleCheck />
          </span>
          <small>접수번호 {done}</small>
          <h1>{isDirectApplication ? "병원 지원이 접수되었습니다" : "무료 상담 신청이 접수되었습니다"}</h1>
          <p>
            {isDirectApplication ? <>해당 병원 채용담당자가 지원 내용을 확인한 뒤<br />직접 연락드릴 예정입니다.</> : <>메디헬퍼스 헤드헌터가 입력하신 조건을 먼저 검토한 뒤<br />선택하신 시간에 연락드리겠습니다.</>}
          </p>
          <div>
            <a
              className="button primary"
              href={withBase(isDoctor ? "/jobs" : "/talent")}
            >
              {isDoctor ? "채용정보 둘러보기" : "인재정보 둘러보기"}{" "}
              <ArrowRight />
            </a>
            <button className="button outline" onClick={() => setDone("")}>
              내용 다시 작성
            </button>
          </div>
        </section>
      </main>
    );
  return (
    <main className="quick-request-page">
      <header
        className={`quick-request-hero ${isDoctor ? "doctor" : "hospital"}`}
      >
        <div>
          <span>
            {isDoctor ? <Stethoscope /> : <BriefcaseBusiness />}{" "}
            {content.eyebrow}
          </span>
          <h1>{isDirectApplication ? "병원 채용공고 지원서" : isHeadhuntPostInquiry ? "맞춤 헤드헌팅 공고 상담" : content.title}</h1>
          <p>{isDirectApplication ? "공고를 등록한 병원 채용담당자에게 이력서와 지원 내용을 직접 전달합니다." : isHeadhuntPostInquiry ? "담당 의사 헤드헌터가 직접 검증해 등록한 공고의 조건을 확인하고 비공개로 상담합니다." : content.description}</p>
          <strong>{isDirectApplication ? "병원 직접 지원 · 헤드헌터 미개입" : "상담 접수 무료 · 결제 없음"}</strong>
        </div>
      </header>
      {isHeadhuntPostInquiry && <section className="quick-linked-post" aria-label="문의할 맞춤 헤드헌팅 공고"><span><Handshake /></span><div><small>HEADHUNTING INQUIRY</small><strong>{headhuntPostTitle || "맞춤 헤드헌팅 공고"}</strong><p>{[headhuntPostHospital, headhuntPostSpecialty].filter(Boolean).join(" · ")} · 이 문의는 담당 의사 헤드헌터에게 전달됩니다.</p></div></section>}
      {isDirectApplication && <section className="quick-linked-post direct" aria-label="지원할 병원 유료 채용광고"><span><BriefcaseBusiness /></span><div><small>DIRECT HOSPITAL APPLICATION</small><strong>병원 유료 채용광고 직접 지원</strong><p>지원 내용은 공고를 등록한 병원에 전달되며 헤드헌터 상담과 분리됩니다.</p></div></section>}
      <section className="quick-request-process">
        <div>
          <small>{isDoctor ? "구직희망" : "구인희망"}</small>
          <h2>
            {isDoctor
              ? isDirectApplication ? "병원에 지원서를 안전하게 전달" : "조건을 남기면 제안과 협상까지"
              : "채용조건을 남기면 후보 확인과 면접까지"}
          </h2>
        </div>
        {processSteps.map(([title, description], index) => (
          <article key={title}>
            <span>STEP {String(index + 1).padStart(2, "0")}</span>
            <div>
              {index === 0 ? (
                <UserRoundSearch />
              ) : index === 1 ? (
                <FileText />
              ) : (
                <Handshake />
              )}
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </section>
      <form
        key={accountProfile.loaded ? "profile-ready" : "profile-loading"}
        className={`quick-request-form intake-request-form ${isDoctor ? "doctor-intake-form" : "hospital-intake-form"}`}
        onSubmit={submit}
      >
        <header>
          <div>
            <small>MEDIHELPERS CONSULTATION</small>
            <h2>{isDirectApplication ? "병원 채용공고 지원서" : isHeadhuntPostInquiry ? "맞춤 헤드헌팅 공고 문의서" : isDoctor ? "의사 선생님 간편 이력서" : "의사 초빙 의뢰서"}</h2>
          </div>
          <p>
            {isDoctor
              ? isDirectApplication ? "저장된 이력서를 선택하면 공고를 등록한 병원에 지원 내용이 전달됩니다." : "간단한 정보와 희망 조건을 작성하면 담당 헤드헌터가 빠르게 연락드립니다."
              : "아래 양식을 작성하면 담당 헤드헌터가 채용조건을 확인하고 최적의 의사를 매칭해드립니다."}
          </p>
        </header>
        {isDirectApplication ? (
          <div className="quick-request-contact-card direct-routing">
            <div>
              <span>지원서 전달 대상</span>
              <strong>이 채용공고를 등록한 병원</strong>
            </div>
            <p>병원 유료 채용광고의 지원서는 의사 헤드헌터 상담함이나 연락처로 전달되지 않습니다.</p>
            <small><b>*</b> 표시는 필수 입력 항목입니다.</small>
          </div>
        ) : (
          <div className="quick-request-contact-card">
            <div><span>전화 상담</span><a href="tel:01024355463">010-2435-5463</a></div>
            <div><span>이메일</span><a href="mailto:hr@medihelpers.co.kr">hr@medihelpers.co.kr</a></div>
            <small><b>*</b> 표시는 필수 입력 항목입니다.</small>
          </div>
        )}
        <div className="quick-request-grid">
          {isDoctor ? (
            <>
              <label>
                <span>이름 *</span>
                <input required name="name" placeholder="성함을 입력해주세요" defaultValue={accountProfile.name} />
              </label>
              <label>
                <span>전화번호 *</span>
                <input required name="phone" type="tel" inputMode="tel" placeholder="010-0000-0000" defaultValue={accountProfile.phone} />
              </label>
              <label>
                <span>전문 분류 *</span>
                <select required name="professionalType" defaultValue="">
                  <option value="" disabled>선택해주세요</option>
                  <option>전문의</option>
                  <option>일반의</option>
                </select>
              </label>
              <label>
                <span>전문과목·주요업무 *</span>
                <input required name="specialty" placeholder="예: 소화기내과, 검진, 외래" defaultValue={headhuntPostSpecialty} />
              </label>
              <label>
                <span>성별 <i>선택</i></span>
                <select name="gender" defaultValue="응답하지 않음">
                  <option>응답하지 않음</option>
                  <option>남성</option>
                  <option>여성</option>
                </select>
              </label>
              <label>
                <span>생년 <i>선택</i></span>
                <input name="birthYear" inputMode="numeric" maxLength="4" placeholder="예: 1985" />
              </label>
              <label>
                <span>이메일 <i>선택</i></span>
                <input name="email" type="email" placeholder="example@email.com" />
              </label>
              <label>
                <span>원하시는 근무지</span>
                <input name="region" placeholder="예: 서울 강남, 경기 수원" />
              </label>
              <label>
                <span>희망 근무형태</span>
                <select name="workType" defaultValue="협의 가능">
                  <option>정규직</option>
                  <option>파트타임</option>
                  <option>당직·대진</option>
                  <option>검진·외래</option>
                  <option>협의 가능</option>
                </select>
              </label>
              <label>
                <span>이직 희망시기</span>
                <select name="startTiming" defaultValue="상담 후 결정">
                  <option>즉시</option>
                  <option>1개월 내</option>
                  <option>3개월 내</option>
                  <option>좋은 제안이 있을 때</option>
                  <option>상담 후 결정</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <label>
                <span>병원·의원명 *</span>
                <input
                  required
                  name="hospital"
                  placeholder="기관명을 입력해주세요"
                  defaultValue={accountProfile.organization}
                />
              </label>
              <label>
                <span>담당자 성함과 직함 *</span>
                <input required name="manager" placeholder="예: 홍길동 원장, 김철수 행정팀장" />
              </label>
              <label>
                <span>담당자 전화번호 *</span>
                <input required name="phone" type="tel" inputMode="tel" placeholder="010-0000-0000" defaultValue={accountProfile.phone} />
              </label>
              <label>
                <span>이메일 <i>선택</i></span>
                <input name="email" type="email" placeholder="example@email.com" />
              </label>
              <label className="wide">
                <span>병원 주소</span>
                <input name="address" placeholder="예: 서울 강남구 역삼동 123-45" />
              </label>
              <label>
                <span>초빙 원하는 전공과목 *</span>
                <input
                  required
                  name="specialty"
                  placeholder="예: 내과, 정형외과, 피부과"
                />
              </label>
              <label>
                <span>예상 페이(Net)</span>
                <input
                  name="salary"
                  placeholder="예: 월 1,500만원 · 협의"
                />
              </label>
              <label>
                <span>희망 연령대 <i>선택</i></span>
                <input name="preferredAge" placeholder="예: 무관, 30~45세" />
              </label>
              <label>
                <span>희망 성별 <i>선택</i></span>
                <select name="preferredGender" defaultValue="무관">
                  <option>무관</option><option>남성</option><option>여성</option>
                </select>
              </label>
              <fieldset className="quick-option-group">
                <legend>세부전공(Fellow)</legend>
                <div className="quick-choice-row">
                  {["무관", "유", "무"].map((item) => <label key={item}><input type="radio" name="fellowship" value={item} defaultChecked={item === "무관"} /><span>{item}</span></label>)}
                </div>
              </fieldset>
              <fieldset className="quick-option-group">
                <legend>관련 경력</legend>
                <div className="quick-choice-row">
                  {["무관", "유", "무"].map((item) => <label key={item}><input type="radio" name="experienceRequired" value={item} defaultChecked={item === "무관"} /><span>{item}</span></label>)}
                </div>
              </fieldset>
              <label>
                <span>근무형태·시간</span>
                <input name="schedule" placeholder="예: 평일 08:30~18:30 · 토 격주" />
              </label>
              <label>
                <span>병상·일평균 환자</span>
                <input name="scale" placeholder="예: 30병상 · 외래 40명" />
              </label>
            </>
          )}
        <div className="wide quick-contact-time">
          <span>연락 희망시간</span>
          <div className="quick-choice-row">
              {["오전", "오후", "저녁", "상관없음"].map((item) => (
                <label key={item}>
                  <input
                    type="radio"
                    name="contactTime"
                    value={item}
                    defaultChecked={item === "상관없음"}
                  />
                  <span>{item}</span>
                </label>
            ))}
          </div>
        </div>
        </div>
        {isDoctor && <ResumeSubmitPicker selectedId={selectedResumeId} onSelect={setSelectedResumeId} onLoaded={setResumes} optional={!(appliedJobId || headhuntPostId)} />}
        <label className="quick-message">
          <span>{isDirectApplication ? "병원 채용담당자에게 전하실 말씀" : isHeadhuntPostInquiry ? "담당 헤드헌터에게 전하실 말씀" : isDoctor ? "헤드헌터에게 전하실 말씀" : "기타 전하실 말씀"}</span>
          <textarea
            name="message"
            rows="6"
            placeholder={
              isDoctor
                ? isHeadhuntPostInquiry ? "이 맞춤 헤드헌팅 공고에서 확인하고 싶은 조건이나 담당 헤드헌터에게 전할 말씀을 작성해주세요." : isDirectApplication ? "병원 채용담당자에게 전달할 지원 동기와 확인할 사항을 작성해주세요." : "근무조건, 희망 페이, 이직 시 중요하게 보는 사항을 자유롭게 작성해주세요."
                : "근무조건, 진료범위, 휴무·당직, 숙소 지원 등 희망사항을 자유롭게 작성해주세요."
            }
          />
        </label>
        <label className="quick-consent">
          <input required name="privacy" type="checkbox" value="agreed" />
          <span>
            <strong>개인정보 수집·이용에 동의합니다. *</strong>
            {isDirectApplication ? "입력 정보는 해당 병원의 채용 지원 확인 목적으로만 사용하며, 채용 절차 종료 또는 목적 달성 후 지체 없이 파기합니다." : "입력 정보는 헤드헌팅 상담과 채용 매칭 목적으로만 사용하며, 상담 종료 또는 목적 달성 후 지체 없이 파기합니다."}
          </span>
        </label>
        {submitError && <p className="quick-submit-error" role="alert">{submitError}</p>}
        <button className="quick-submit" type="submit" disabled={submitting}>
          <span className="quick-submit-label">
          {isDirectApplication ? "이 병원에 지원하기" : isHeadhuntPostInquiry ? "이 공고 헤드헌터에게 문의하기" : isDoctor ? "간편 이력서 제출하기" : "의사 초빙 의뢰하기"} <ArrowRight />
          </span>
          {submitting && <span>안전하게 접수 중입니다…</span>}
        </button>
        <p className="quick-security">
          <ShieldCheck />{" "}
          {isDoctor
            ? isDirectApplication ? "선택한 이력서는 지원한 병원의 채용 확인 목적으로만 전달됩니다." : "본인의 동의 없이 이직 의사와 이력서를 병원에 공개하지 않습니다."
            : "후보자의 동의를 확인한 뒤 필요한 정보만 병원에 전달합니다."}
        </p>
      </form>
    </main>
  );
}
