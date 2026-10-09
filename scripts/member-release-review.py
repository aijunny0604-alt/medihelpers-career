"""Prepare private, per-member migration work queues. No DB/network writes.

This classifies captured evidence; no queue is permission to activate an account.
Never copies password hashes, contact details or source rows into its output.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path


def review(members, details, withdrawals, jobs, payments):
    def index_unique(rows):
        result = {}
        for row in rows:
            key = row.get('legacyId')
            if not isinstance(key, str) or not key.strip() or key in result:
                raise ValueError('Missing or duplicate legacy identity')
            result[key] = row
        return result

    member_index = index_unique(members)
    detail_index = index_unique(details)
    if set(member_index) != set(detail_index):
        raise ValueError('Member/detail identity sets differ')
    held = {r['legacyId'] for r in withdrawals}
    emails = collections.Counter(str(m.get('email') or '').strip().lower() for m in members)
    records = []
    for member in members:
        key = member['legacyId']
        credential = detail_index[key].get('credentialCandidate') or {}
        email = str(member.get('email') or '').strip().lower()
        reasons = []
        if key in held:
            reasons.append('WITHDRAWAL_REQUEST_REVIEW')
        if member.get('status') != 'active':
            reasons.append('SOURCE_STATUS_NOT_CONFIRMED_ACTIVE')
        if member.get('role') not in ('doctor', 'hospital'):
            reasons.append('ROLE_UNVERIFIED')
        valid_email = bool(email and '@' in email and '.' in email.rsplit('@', 1)[-1] and not any(c.isspace() for c in email))
        if not valid_email:
            recovery = 'ASSISTED_IDENTITY_RECOVERY'
            reasons.append('EMAIL_REVIEW')
        elif emails[email] > 1:
            recovery = 'EXACT_LEGACY_ID_AND_MAILBOX'
            reasons.append('SHARED_EMAIL_DO_NOT_MERGE')
        else:
            recovery = 'UNIQUE_MAILBOX'
        if credential.get('needsReset') is True:
            login = 'RESET_REQUIRED'
        elif credential.get('needsReset') is False:
            login = 'LEGACY_PASSWORD_UNVERIFIED'
        else:
            login = 'CREDENTIAL_REVIEW'
        if credential.get('verifiedByLogin') is not True:
            reasons.append('REAL_LOGIN_NOT_VERIFIED')
        records.append({
            'legacyId': key, 'role': member.get('role'), 'loginPath': login,
            'recoveryPath': recovery, 'holdReasons': reasons,
            'sameOwnerJobs': [j['contentId'] for j in jobs if j.get('legacyId') == key and j.get('ownershipStatus') == 'legacy-id-matched'],
            'historicalPaymentCount': sum(p.get('legacyId') == key for p in payments),
            'activationApproved': False,
        })
    matched = [j for j in jobs if j.get('legacyId') in member_index and j.get('ownershipStatus') == 'legacy-id-matched']
    summary = {
        'members': len(records),
        'roles': dict(collections.Counter(r['role'] for r in records)),
        'loginPaths': dict(collections.Counter(r['loginPath'] for r in records)),
        'recoveryPaths': dict(collections.Counter(r['recoveryPath'] for r in records)),
        'holdReasons': dict(collections.Counter(reason for r in records for reason in r['holdReasons'])),
        'withdrawalReferencesOutsideMemberCapture': len(held - set(member_index)),
        'jobs': len(jobs), 'jobsWithCapturedOwner': len(matched),
        'jobsNeedingOwnerReview': len(jobs) - len(matched),
        'payments': len(payments),
        'paymentRecordsWithCapturedOwner': sum(p.get('legacyId') in member_index for p in payments),
        'activationApproved': 0, 'remoteWrites': False,
        'scope': 'Captured evidence only; source freshness, status and paid rights still require verification',
    }
    return {'summary': summary, 'members': records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('private_directory', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    output = args.output.resolve()
    if output == repo or repo in output.parents:
        raise ValueError('Private report must be outside the repository')
    filenames = ['rankup-normalized-members-private.json', 'rankup-personal-details-private.json',
                 'rankup-hospital-details-private.json', 'migration-withdrawal-hold-private.json',
                 'job-ownership-plan-private.json', 'migration-payments-plan-private.json']
    raw = [(args.private_directory / name).read_bytes() for name in filenames]
    values = [json.loads(data.decode('utf-8-sig')) for data in raw]
    result = review(values[0], values[1] + values[2], *values[3:])
    result['inputSha256'] = dict(zip(filenames, [hashlib.sha256(data).hexdigest() for data in raw]))
    # Do not overwrite earlier evidence or any source file.
    with output.open('x', encoding='utf-8') as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
    print(json.dumps(result['summary'], ensure_ascii=False))


if __name__ == '__main__':
    main()
