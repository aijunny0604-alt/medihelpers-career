import React, { useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleCheck,
  FileText,
  Handshake,
  ShieldCheck,
  Stethoscope,
  Upload,
  UserRoundSearch,
} from "lucide-react";
import { appendStoredRecord } from "./browserStorage.js";
import { withBase } from "./basePath.js";

const copy = {
  doctor: {
    eyebrow: "FREE JOB-SEEKING REQUEST",
    title: "의료인 구직희망 접수",
    description:
      "원하는 근무조건을 남기면 메디헬퍼스 헤드헌터가 확인한 뒤 비공개로 연락드립니다.",
    steps: [
      ["상담 접수", "희망 지역·전문과·근무형태 입력"],
      ["맞춤 제안", "조건에 맞는 공개·비공개 공고 안내"],
      ["협상·입사", "면접부터 근무조건 조율까지 지원"],
    ],
  },
  hospital: {
    eyebrow: "FREE HIRING REQUEST",
    title: "병원 구인희망 접수",
    description:
      "필요한 의사 조건을 남기면 메디헬퍼스 헤드헌터가 채용조건을 정리해 연락드립니다.",
    steps: [
      ["초빙 의뢰", "진료과·일정·보수조건 입력"],
      ["후보 추천", "적합성 확인 후 동의된 후보 제안"],
      ["면접·채용", "면접과 조건 협상·입사 일정 지원"],
    ],
  },
};

export default function HeadHunterRequestPage({ mode = "doctor" }) {
  const isDoctor = mode === "doctor";
  const content = copy[mode];
  const [done, setDone] = useState("");
  const [file, setFile] = useState(null);
  const submit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = `${isDoctor ? "SEEK" : "HIRE"}-${String(Date.now()).slice(-7)}`;
    form.delete("attachment");
    appendStoredRecord(
      isDoctor
        ? "medihelpers_jobseeker_requests"
        : "medihelpers_hiring_requests",
      {
        id,
        createdAt: new Date().toISOString(),
        status: "new",
        attachmentName: file?.name || "",
        ...Object.fromEntries(form.entries()),
      },
    );
    setDone(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  if (done)
    return (
      <main className="quick-request-page">
        <section className="quick-request-complete">
          <span>
            <CircleCheck />
          </span>
          <small>접수번호 {done}</small>
          <h1>무료 상담 신청이 접수되었습니다</h1>
          <p>
            메디헬퍼스 헤드헌터가 입력하신 조건을 먼저 검토한 뒤<br />
            선택하신 시간에 연락드리겠습니다.
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
          <h1>{content.title}</h1>
          <p>{content.description}</p>
          <strong>상담 접수 무료 · 결제 없음</strong>
        </div>
      </header>
      <section className="quick-request-process">
        <div>
          <small>{isDoctor ? "구직희망" : "구인희망"}</small>
          <h2>
            {isDoctor
              ? "조건을 남기면 제안과 협상까지"
              : "채용조건을 남기면 후보 확인과 면접까지"}
          </h2>
        </div>
        {content.steps.map(([title, description], index) => (
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
      <form className="quick-request-form" onSubmit={submit}>
        <header>
          <div>
            <small>MEDIHELPERS CONSULTATION</small>
            <h2>상담 신청</h2>
          </div>
          <p>
            필요한 사항만 입력해주세요. 담당 헤드헌터가 세부 조건을 함께
            정리합니다.
          </p>
        </header>
        <div className="quick-request-grid">
          {isDoctor ? (
            <>
              <label>
                <span>이름 *</span>
                <input required name="name" placeholder="성함을 입력해주세요" />
              </label>
              <label>
                <span>전문과목·직군 *</span>
                <input
                  required
                  name="specialty"
                  placeholder="예: 소화기내과 전문의, 간호사"
                />
              </label>
              <label>
                <span>세부분과·주요업무</span>
                <input
                  name="subspecialty"
                  placeholder="예: 내시경, 검진, 병동간호"
                />
              </label>
              <label>
                <span>희망 근무지역 *</span>
                <input required name="region" placeholder="예: 부산·경남" />
              </label>
              <label>
                <span>희망 근무형태 *</span>
                <select required name="workType">
                  <option value="">선택</option>
                  <option>정규직</option>
                  <option>파트타임</option>
                  <option>당직·대진</option>
                  <option>검진·외래</option>
                  <option>협의 가능</option>
                </select>
              </label>
              <label>
                <span>이직 희망시기</span>
                <select name="startTiming">
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
                />
              </label>
              <label>
                <span>담당자명 *</span>
                <input required name="manager" placeholder="채용 담당자 성함" />
              </label>
              <label>
                <span>병상·일평균 환자</span>
                <input name="scale" placeholder="예: 30병상 · 외래 40명" />
              </label>
              <label>
                <span>초빙과목 *</span>
                <input
                  required
                  name="specialty"
                  placeholder="예: 소화기내과 전문의"
                />
              </label>
              <label>
                <span>제안 보수</span>
                <input
                  name="salary"
                  placeholder="예: NET 월 2,000만원 · 협의"
                />
              </label>
              <label>
                <span>근무형태·시간</span>
                <input
                  name="schedule"
                  placeholder="예: 평일 08:30~18:30 · 토 격주"
                />
              </label>
            </>
          )}
          <label>
            <span>휴대전화 *</span>
            <input
              required
              name="phone"
              type="tel"
              placeholder="010-0000-0000"
            />
          </label>
          <label>
            <span>이메일 *</span>
            <input
              required
              name="email"
              type="email"
              placeholder="contact@example.com"
            />
          </label>
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
        {isDoctor && (
          <div className="quick-file-upload">
            <div>
              <Upload />
              <span>
                <strong>
                  기존 이력서 공유 <i>선택</i>
                </strong>
                <small>PDF·DOC·DOCX·HWP·HWPX, 최대 10MB</small>
              </span>
            </div>
            <label>
              <input
                name="attachment"
                type="file"
                accept=".pdf,.doc,.docx,.hwp,.hwpx"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              {file?.name || "파일 선택"}
            </label>
          </div>
        )}
        <label className="quick-message">
          <span>상담을 원하는 내용</span>
          <textarea
            name="message"
            rows="6"
            placeholder={
              isDoctor
                ? "희망 보수, 피하고 싶은 조건, 궁금한 점을 자유롭게 적어주세요."
                : "채용 배경, 필요 경력, 근무조건과 꼭 확인할 사항을 적어주세요."
            }
          />
        </label>
        <label className="quick-consent">
          <input required name="privacy" type="checkbox" value="agreed" />
          <span>
            상담과 채용 매칭을 위한 개인정보 수집·이용에 동의합니다. 입력 정보는
            메디헬퍼스 헤드헌터 상담 목적으로만 사용합니다.
          </span>
        </label>
        <button className="quick-submit" type="submit">
          무료 상담 신청 <ArrowRight />
        </button>
        <p className="quick-security">
          <ShieldCheck />{" "}
          {isDoctor
            ? "본인의 동의 없이 이직 의사와 이력서를 병원에 공개하지 않습니다."
            : "후보자의 동의를 확인한 뒤 필요한 정보만 병원에 전달합니다."}
        </p>
      </form>
    </main>
  );
}
