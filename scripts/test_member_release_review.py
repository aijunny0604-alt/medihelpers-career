import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('review', Path(__file__).with_name('member-release-review.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReviewTest(unittest.TestCase):
    def run_review(self, members=None, details=None, holds=None):
        members = members if members is not None else [{'legacyId': 'm1', 'role': 'doctor', 'status': 'unverified', 'email': 'private@example.invalid'}]
        details = details if details is not None else [{'legacyId': 'm1', 'credentialCandidate': {'needsReset': True, 'hash': 'secret-hash', 'verifiedByLogin': False}}]
        return module.review(members, details, holds or [], [], [])

    def test_reset_does_not_authorize_activation(self):
        r = self.run_review()
        self.assertEqual(r['summary']['loginPaths'], {'RESET_REQUIRED': 1})
        self.assertFalse(r['members'][0]['activationApproved'])
        self.assertIn('SOURCE_STATUS_NOT_CONFIRMED_ACTIVE', r['members'][0]['holdReasons'])

    def test_shared_mailbox_never_merges(self):
        members = [{'legacyId': k, 'role': 'hospital', 'email': e} for k, e in [('a', 'Same@example.invalid'), ('b', 'same@example.invalid')]]
        r = self.run_review(members, [{'legacyId': k} for k in ['a', 'b']])
        self.assertEqual(r['summary']['recoveryPaths'], {'EXACT_LEGACY_ID_AND_MAILBOX': 2})
        self.assertEqual(len(r['members']), 2)

    def test_withdrawal_and_unknown_withdrawal(self):
        r = self.run_review(holds=[{'legacyId': 'm1'}, {'legacyId': 'missing'}])
        self.assertIn('WITHDRAWAL_REQUEST_REVIEW', r['members'][0]['holdReasons'])
        self.assertEqual(r['summary']['withdrawalReferencesOutsideMemberCapture'], 1)

    def test_duplicate_or_missing_details_rejected(self):
        for details in [[], [{'legacyId': 'm1'}, {'legacyId': 'm1'}]]:
            with self.assertRaises(ValueError):
                self.run_review(details=details)

    def test_no_credential_or_contact_in_report(self):
        text = str(self.run_review())
        self.assertNotIn('secret-hash', text)
        self.assertNotIn('private@example.invalid', text)

    def test_invalid_email_requires_assisted_recovery(self):
        r = self.run_review(members=[{'legacyId': 'm1', 'role': 'doctor', 'email': ''}])
        self.assertEqual(r['members'][0]['recoveryPath'], 'ASSISTED_IDENTITY_RECOVERY')


if __name__ == '__main__':
    unittest.main()
