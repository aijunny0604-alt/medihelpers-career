import React, { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, CircleAlert, Clock3, Mail, MessageSquareText, Phone, RefreshCw, Search, ShieldCheck, Stethoscope, Building2 } from "lucide-react";

const statusOptions = [
  ["new", "신규 접수"],
  ["contacted", "첫 연락 완료"],
  ["in_progress", "상담 진행 중"],
  ["closed", "상담 종료"],
];
const labels = Object.fromEntries(statusOptions);
const fieldLabels = {
  name: "성함", hospital: "병·의원명", manager: "담당자", phone: "전화번호", email: "이메일",
  professionalType: "전문 분류", specialty: "전공·직군", region: "희망 지역", address: "병원 주소",
  workType: "근무 형태", startTiming: "이직 희망시기", salary: "예상 페이", preferredAge: "희망 연령",
  preferredGender: "희망 성별", fellowship: "세부전공", experienceRequired: "경력", schedule: "근무시간",
  scale: "병상·환자 규모", contactTime: "연락 희망시간", message: "전달사항", attachmentName: "첨부파일명",
  gender: "성별", birthYear: "생년",
};

export default function ConsultationAdminPage() {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/consultations", { headers: { accept: "application/json" } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "상담함을 불러오지 못했습니다.");
      setRequests(result.requests || []);
      setSelectedId((current) => current || result.requests?.[0]?.id || "");
    } catch (caught) { setError(caught.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => requests.filter((item) => {
    if (filter !== "all" && item.status !== filter) return false;
    const haystack = `${item.id} ${item.requesterName} ${item.phone} ${item.email} ${item.specialty}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [requests, filter, query]);
  const selected = requests.find((item) => item.id === selectedId) || visible[0];
  const counts = Object.fromEntries(statusOptions.map(([value]) => [value, requests.filter((item) => item.status === value).length]));

  const update = async (id, status, adminNote = selected?.adminNote || "") => {
    const response = await fetch(`/api/consultations/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, adminNote }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "상태를 저장하지 못했습니다.");
    setRequests((current) => current.map((item) => item.id === id ? { ...item, status, adminNote } : item));
  };

  if (error && !requests.length) return <section className="consult-admin-access"><ShieldCheck /><small>SECURE ADMIN AREA</small><h1>관리자 상담함</h1><p>{error}</p><span>개인정보 보호를 위해 등록된 관리자 계정으로 로그인한 경우에만 상담 데이터를 확인할 수 있습니다.</span><a href="/" className="button primary">홈으로 돌아가기</a></section>;

  return <section className="consult-admin-page">
    <header className="consult-admin-hero"><div><span><BellRing /> CONSULTATION INBOX</span><h1>상담 신청 관리</h1><p>의사 구직희망과 병원 구인희망을 한곳에서 확인하고 연락 진행 상태를 관리합니다.</p></div><button type="button" onClick={load}><RefreshCw /> 새로고침</button></header>
    <div className="consult-admin-metrics">
      <article><span><MessageSquareText /></span><small>전체 상담</small><strong>{requests.length}</strong></article>
      <article className="new"><span><BellRing /></span><small>신규 접수</small><strong>{counts.new || 0}</strong></article>
      <article><span><Clock3 /></span><small>진행 중</small><strong>{(counts.contacted || 0) + (counts.in_progress || 0)}</strong></article>
      <article><span><CheckCircle2 /></span><small>상담 종료</small><strong>{counts.closed || 0}</strong></article>
    </div>
    <div className="consult-admin-toolbar"><div className="consult-admin-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>전체</button>{statusOptions.map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label} <b>{counts[value] || 0}</b></button>)}</div><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름·병원·진료과 검색" /></label></div>
    {loading ? <div className="consult-admin-loading">상담 데이터를 불러오는 중입니다…</div> : <div className="consult-admin-layout">
      <div className="consult-admin-list">{visible.length ? visible.map((item) => <button key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)}><span className={`request-kind ${item.requestType}`}>{item.requestType === "doctor" ? <Stethoscope /> : <Building2 />}{item.requestType === "doctor" ? "의사 구직" : "병원 구인"}</span><div><strong>{item.requesterName}</strong><p>{item.specialty || "전공 미입력"} · {item.phone}</p></div><small>{new Date(`${item.createdAt}Z`).toLocaleString("ko-KR")}</small><i className={`status ${item.status}`}>{labels[item.status]}</i></button>) : <div className="consult-admin-empty">조건에 맞는 상담이 없습니다.</div>}</div>
      {selected && <aside className="consult-admin-detail"><div className="detail-head"><div><span>{selected.id}</span><h2>{selected.requesterName}</h2><p>{selected.requestType === "doctor" ? "의사 구직희망" : "병원 구인희망"} · {new Date(`${selected.createdAt}Z`).toLocaleString("ko-KR")}</p></div><select value={selected.status} onChange={(event) => update(selected.id, event.target.value)}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="detail-actions"><a href={`tel:${selected.phone}`}><Phone /> 전화하기</a>{selected.email && <a href={`mailto:${selected.email}`}><Mail /> 메일 보내기</a>}</div><dl>{Object.entries(selected.payload || {}).filter(([key, value]) => value && key !== "privacy").map(([key, value]) => <div key={key} className={key === "message" ? "wide" : ""}><dt>{fieldLabels[key] || key}</dt><dd>{value}</dd></div>)}</dl><label className="admin-note"><span>관리 메모</span><textarea key={`${selected.id}-${selected.adminNote}`} defaultValue={selected.adminNote} placeholder="통화 내용이나 다음 연락 일정을 기록해 주세요." onBlur={(event) => update(selected.id, selected.status, event.target.value)} /></label><div className="notification-result"><span className={selected.emailNotificationStatus}><Mail /> 메일 {selected.emailNotificationStatus === "sent" ? "발송 완료" : selected.emailNotificationStatus === "not_configured" ? "설정 필요" : "발송 실패"}</span><span className={selected.smsNotificationStatus}><Phone /> 문자 {selected.smsNotificationStatus === "sent" ? "발송 완료" : selected.smsNotificationStatus === "not_configured" ? "설정 필요" : "발송 실패"}</span></div></aside>}
    </div>}
  </section>;
}
