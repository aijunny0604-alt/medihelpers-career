-- Earlier encoding failures can contain the Unicode replacement character.
-- The original bytes are lost, so use safe fallbacks and preserve valid JSON.
UPDATE resumes
SET title = COALESCE(NULLIF(TRIM(specialty), ''), NULLIF(TRIM(profession), ''), '의료인') || ' 이력서'
WHERE instr(title, char(65533)) > 0;

UPDATE resumes SET desired_regions = '' WHERE instr(desired_regions, char(65533)) > 0;
UPDATE resumes SET specialty = '' WHERE instr(specialty, char(65533)) > 0;
UPDATE resumes SET profession = '의료인' WHERE instr(profession, char(65533)) > 0;
UPDATE resumes SET detail_json = replace(detail_json, char(65533), '') WHERE instr(detail_json, char(65533)) > 0;

UPDATE job_seeker_posts
SET title = COALESCE(NULLIF(TRIM(specialty), ''), '의료인') || ' · 구직 중'
WHERE instr(title, char(65533)) > 0;
UPDATE job_seeker_posts SET summary = '' WHERE instr(summary, char(65533)) > 0;
UPDATE job_seeker_posts SET desired_region = '' WHERE instr(desired_region, char(65533)) > 0;
UPDATE job_seeker_posts SET specialty = '' WHERE instr(specialty, char(65533)) > 0;

UPDATE member_activity SET title = '활동 기록' WHERE instr(title, char(65533)) > 0;
UPDATE member_activity SET detail = '' WHERE instr(detail, char(65533)) > 0;
UPDATE member_notifications SET title = '알림' WHERE instr(title, char(65533)) > 0;
UPDATE member_notifications SET body = '' WHERE instr(body, char(65533)) > 0;

UPDATE member_profiles SET display_name = '' WHERE instr(display_name, char(65533)) > 0;
UPDATE member_profiles SET organization = '' WHERE instr(organization, char(65533)) > 0;
UPDATE member_profiles SET job_title = '' WHERE instr(job_title, char(65533)) > 0;
