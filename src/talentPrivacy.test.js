import test from "node:test";
import assert from "node:assert/strict";
import {
  canRevealTalentIdentity,
  maskTalentName,
  talentDisplayName,
} from "./talentPrivacy.js";

test("비회원과 의료인 회원에게는 성만 남기고 이름을 가린다", () => {
  assert.equal(maskTalentName("김현우"), "김○○");
  assert.equal(talentDisplayName({ name: "김현우", identityConsent: true }, false), "김○○");
});

test("병원은 후보자 동의 + 열람권이 모두 있어야 실명을 볼 수 있다", () => {
  // 열람권을 결제한 병원만 실명 공개
  assert.equal(canRevealTalentIdentity({ hospital: true, talentUnlocked: true }, true), true);
  // 병원이어도 열람권이 없으면 비공개 (수익모델 보호)
  assert.equal(canRevealTalentIdentity({ hospital: true }, true), false);
  assert.equal(canRevealTalentIdentity({ hospital: true, talentUnlocked: false }, true), false);
  // 관리자는 운영 목적상 동의가 있으면 열람 가능
  assert.equal(canRevealTalentIdentity({ admin: true }, true), true);
  // 후보자 동의가 없으면 누구도 볼 수 없다
  assert.equal(canRevealTalentIdentity({ hospital: true, talentUnlocked: true }, false), false);
  assert.equal(canRevealTalentIdentity({ admin: true }, false), false);
  // 의사 회원은 열람 불가
  assert.equal(canRevealTalentIdentity({ doctor: true }, true), false);
});

test("권한과 동의가 모두 확인되면 실명을 표시한다", () => {
  assert.equal(talentDisplayName({ name: "김현우", identityConsent: true }, true), "김현우");
  assert.equal(talentDisplayName({ name: "김현우", identityConsent: false }, true), "김○○");
});
