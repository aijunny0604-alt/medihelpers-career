import test from "node:test";
import assert from "node:assert/strict";
import {
  canRevealTalentIdentity,
  maskTalentName,
  talentDisplayName,
} from "./talentPrivacy.js";

test("비회원과 일반 회원에게는 성만 남기고 이름을 가린다", () => {
  assert.equal(maskTalentName("김현우"), "김○○");
  assert.equal(talentDisplayName({ name: "김현우", identityConsent: true }, false), "김○○");
});

test("병원과 관리자도 후보자 동의가 있어야 실명을 볼 수 있다", () => {
  assert.equal(canRevealTalentIdentity({ hospital: true }, true), true);
  assert.equal(canRevealTalentIdentity({ admin: true }, true), true);
  assert.equal(canRevealTalentIdentity({ hospital: true }, false), false);
  assert.equal(canRevealTalentIdentity({ doctor: true }, true), false);
});

test("권한과 동의가 모두 확인되면 실명을 표시한다", () => {
  assert.equal(talentDisplayName({ name: "김현우", identityConsent: true }, true), "김현우");
  assert.equal(talentDisplayName({ name: "김현우", identityConsent: false }, true), "김○○");
});
