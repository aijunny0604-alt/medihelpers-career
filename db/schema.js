export const accountSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_key TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'hospital')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS consent_records (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('terms', 'age_confirmation', 'privacy_notice_ack')),
    document_version TEXT NOT NULL,
    accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    UNIQUE (account_id, consent_type, document_version)
  )`,
  `CREATE INDEX IF NOT EXISTS consent_records_account_idx ON consent_records(account_id)`
];

export const consultationSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS consultation_requests (
    id TEXT PRIMARY KEY,
    request_type TEXT NOT NULL CHECK (request_type IN ('doctor', 'hospital')),
    requester_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    specialty TEXT,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'closed')),
    admin_note TEXT NOT NULL DEFAULT '',
    email_notification_status TEXT NOT NULL DEFAULT 'pending',
    sms_notification_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS consultation_requests_created_idx ON consultation_requests(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS consultation_requests_status_idx ON consultation_requests(status, created_at DESC)`
];

export const memberCenterSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS member_profiles (
    account_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    organization TEXT NOT NULL DEFAULT '',
    job_title TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS member_preferences (
    account_id TEXT PRIMARY KEY,
    email_notifications INTEGER NOT NULL DEFAULT 1,
    sms_notifications INTEGER NOT NULL DEFAULT 1,
    service_notifications INTEGER NOT NULL DEFAULT 1,
    marketing_notifications INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS member_activity (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS member_activity_account_idx ON member_activity(account_id, occurred_at DESC)`
];

export const commerceSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS account_admin_profiles (
    account_id TEXT PRIMARY KEY,
    email TEXT NOT NULL DEFAULT '',
    full_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','withdrawn')),
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified','rejected')),
    joined_from TEXT NOT NULL DEFAULT 'sites',
    last_login_at TEXT,
    admin_note TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS payment_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    account_id TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('doctor_ad','membership','medical_staff_ad','headhunting')),
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KRW',
    supply_amount INTEGER NOT NULL DEFAULT 0,
    tax_amount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','awaiting_payment','paid','failed','cancelled','partially_refunded','refunded')),
    payment_method TEXT NOT NULL DEFAULT '',
    customer_name TEXT NOT NULL DEFAULT '',
    customer_email TEXT NOT NULL DEFAULT '',
    customer_phone TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    admin_note TEXT NOT NULL DEFAULT '',
    paid_at TEXT,
    cancelled_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
  )`,
  `CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('authorization','capture','failure','cancellation','refund')),
    provider TEXT NOT NULL DEFAULT 'manual',
    provider_transaction_id TEXT NOT NULL DEFAULT '',
    amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed','cancelled')),
    failure_code TEXT NOT NULL DEFAULT '',
    failure_message TEXT NOT NULL DEFAULT '',
    processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS payment_refunds (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    transaction_id TEXT,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','succeeded','failed','cancelled')),
    requested_by TEXT NOT NULL DEFAULT '',
    provider_refund_id TEXT NOT NULL DEFAULT '',
    processed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payment_receipts (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    supply_amount INTEGER NOT NULL,
    tax_amount INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    receipt_type TEXT NOT NULL DEFAULT 'payment_receipt' CHECK (receipt_type IN ('payment_receipt','tax_invoice','cash_receipt')),
    issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TEXT,
    FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS payment_events (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    actor_key TEXT NOT NULL DEFAULT '',
    event_type TEXT NOT NULL,
    from_status TEXT NOT NULL DEFAULT '',
    to_status TEXT NOT NULL DEFAULT '',
    detail_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    order_number TEXT NOT NULL DEFAULT '',
    event_type TEXT NOT NULL,
    signature_verified INTEGER NOT NULL DEFAULT 0,
    payload_hash TEXT NOT NULL DEFAULT '',
    processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received','processed','ignored','failed')),
    error_message TEXT NOT NULL DEFAULT '',
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT,
    UNIQUE(provider, provider_event_id)
  )`,
  `CREATE INDEX IF NOT EXISTS account_admin_profiles_status_idx ON account_admin_profiles(status, verification_status, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS payment_orders_account_idx ON payment_orders(account_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON payment_orders(status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS payment_transactions_order_idx ON payment_transactions(order_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS payment_refunds_order_idx ON payment_refunds(order_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS payment_events_order_idx ON payment_events(order_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS payment_webhook_order_idx ON payment_webhook_events(order_number, received_at DESC)`
];

export const recruitmentCrmSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS recruitment_cases (
    id TEXT PRIMARY KEY,
    consultation_id TEXT,
    hospital_name TEXT NOT NULL,
    specialty TEXT NOT NULL DEFAULT '',
    position_title TEXT NOT NULL DEFAULT '',
    stage TEXT NOT NULL DEFAULT 'new_request' CHECK (stage IN ('new_request','condition_review','candidate_search','candidate_consent','hospital_submitted','interview','negotiation','hired','closed')),
    assigned_recruiter TEXT NOT NULL DEFAULT '',
    success_fee_terms TEXT NOT NULL DEFAULT '',
    estimated_fee INTEGER NOT NULL DEFAULT 0,
    next_action TEXT NOT NULL DEFAULT '',
    billing_status TEXT NOT NULL DEFAULT 'success_fee',
    hired_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_id) REFERENCES consultation_requests(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS candidate_submissions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    candidate_public_id TEXT NOT NULL,
    candidate_private_ref TEXT NOT NULL DEFAULT '',
    consent_status TEXT NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending','granted','revoked','declined')),
    submission_status TEXT NOT NULL DEFAULT 'identified',
    proposed_terms_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES recruitment_cases(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS interview_events (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    submission_id TEXT,
    scheduled_at TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES recruitment_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (submission_id) REFERENCES candidate_submissions(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS consent_grants (
    id TEXT PRIMARY KEY,
    candidate_private_ref TEXT NOT NULL,
    case_id TEXT NOT NULL,
    hospital_name TEXT NOT NULL,
    scope_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'granted' CHECK (status IN ('granted','revoked','expired')),
    granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TEXT,
    FOREIGN KEY (case_id) REFERENCES recruitment_cases(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS billing_records (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    billing_type TEXT NOT NULL CHECK (billing_type IN ('success_fee','advertisement','medical_staff_ad','talent_search')),
    amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','invoiced','paid','cancelled')),
    due_at TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES recruitment_cases(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS access_audit_logs (
    id TEXT PRIMARY KEY,
    actor_key TEXT NOT NULL,
    action TEXT NOT NULL,
    subject_ref TEXT NOT NULL DEFAULT '',
    case_id TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES recruitment_cases(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS recruitment_cases_stage_idx ON recruitment_cases(stage, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS candidate_submissions_case_idx ON candidate_submissions(case_id, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS consent_grants_case_idx ON consent_grants(case_id, status)`,
  `CREATE INDEX IF NOT EXISTS billing_records_case_idx ON billing_records(case_id, status)`,
  `CREATE INDEX IF NOT EXISTS access_audit_logs_case_idx ON access_audit_logs(case_id, created_at DESC)`
];

export const adminConsoleSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS admin_content_records (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL CHECK (content_type IN ('doctor_job','medical_job','talent_profile','notice')),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden','closed')),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','doctor','hospital','admin')),
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL DEFAULT '',
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admin_categories (
    id TEXT PRIMARY KEY,
    group_key TEXT NOT NULL CHECK (group_key IN ('doctor_specialty','region','medical_role')),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_key, slug)
  )`,
  `CREATE TABLE IF NOT EXISTS site_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS feature_flags (
    flag_key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS admin_categories_group_idx ON admin_categories(group_key, sort_order, name)`,
  `CREATE INDEX IF NOT EXISTS admin_content_records_type_idx ON admin_content_records(content_type, status, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx ON admin_audit_logs(created_at DESC)`
];
