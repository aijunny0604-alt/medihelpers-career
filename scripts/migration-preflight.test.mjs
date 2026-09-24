import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMigration } from './lib/migration-preflight.mjs';
function fixture() {
  return {schemaVersion:1,sourceCounts:{members:1,resumes:1,posts:1,payments:1,entitlements:1},
    members:[{legacyId:'m1',email:'synthetic@example.invalid',role:'doctor',status:'active',name:'합성회원',phone:'010-0000-0000',consentEvidence:true}],
    resumes:[{legacyId:'r1',memberId:'m1',visibility:'private'}],
    posts:[{legacyId:'p1',memberId:'m1',resumeId:'r1',visibility:'private'}],
    payments:[{legacyId:'o1',memberId:'m1',amount:1000,refundedAmount:0,status:'paid',tid:'synthetic'}],
    entitlements:[{legacyId:'e1',memberId:'m1',paymentId:'o1',remainingCredits:1,expiresAt:null}]};
}
const has=(r,c)=>r.issues.some(x=>x.code===c);
test('valid export still requires credential and operational review',()=>{const r=validateMigration(fixture());assert.equal(r.blockers,0);assert.equal(r.importReady,false);});
test('missing tables and source totals cannot pass',()=>assert.ok(validateMigration({}).blockers>0));
test('duplicate email is not silently merged',()=>{const f=fixture();f.members.push({...f.members[0],legacyId:'m2',email:'SYNTHETIC@example.invalid'});assert.ok(has(validateMigration(f),'DUPLICATE_EMAIL_REVIEW'));});
test('missing email needs assisted recovery',()=>{const f=fixture();f.members[0].email='';assert.ok(has(validateMigration(f),'EMAIL_RECOVERY_REQUIRED'));});
test('legacy admin role cannot grant new admin access',()=>{const f=fixture();f.members[0].role='admin';assert.ok(has(validateMigration(f),'ROLE_MAPPING_REQUIRED'));});
test('withdrawn member must not reactivate',()=>{const f=fixture();f.members[0].status='withdrawn';assert.ok(has(validateMigration(f),'DO_NOT_REACTIVATE'));});
test('orphan ownership is blocked',()=>{const f=fixture();f.posts[0].memberId='missing';assert.ok(has(validateMigration(f),'ORPHAN_MEMBER'));assert.ok(has(validateMigration(f),'RESUME_OWNER_MISMATCH'));});
test('public resume requires evidence',()=>{const f=fixture();f.resumes[0].visibility='public';assert.ok(has(validateMigration(f),'PUBLICATION_CONSENT_MISSING'));});
test('refund cannot exceed original amount',()=>{const f=fixture();f.payments[0].refundedAmount=1001;assert.ok(has(validateMigration(f),'REFUND_RECONCILIATION_REQUIRED'));});
test('cancelled order cannot grant rights',()=>{const f=fixture();f.payments[0].status='cancelled';assert.ok(has(validateMigration(f),'UNPAID_ENTITLEMENT'));});
test('invalid expiry is blocked',()=>{const f=fixture();delete f.entitlements[0].expiresAt;assert.ok(has(validateMigration(f),'EXPIRY_MAPPING_REQUIRED'));});
test('report contains no identity or credential fields',()=>{const f=fixture();f.members[0].passwordHash='secret-example';const r=validateMigration(f);assert.ok(has(r,'CREDENTIALS_NOT_ALLOWED_IN_NORMALIZED_EXPORT'));const s=JSON.stringify(r);for(const value of ['secret-example','synthetic@example.invalid','010-0000-0000','합성회원'])assert.ok(!s.includes(value));});
