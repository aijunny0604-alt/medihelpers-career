import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serverSource = readFileSync(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');
const uploadSource = readFileSync(new URL('./jobPostingUpload.js', import.meta.url), 'utf8');
const resumePickerSource = readFileSync(new URL('./ResumeSubmitPicker.jsx', import.meta.url), 'utf8');
const requestPageSource = readFileSync(new URL('./HeadHunterRequestPage.jsx', import.meta.url), 'utf8');
const resumePageSource = readFileSync(new URL('./ResumePage.jsx', import.meta.url), 'utf8');
const resumePhotoSource = readFileSync(new URL('./resumePhotoUpload.js', import.meta.url), 'utf8');

test('Sites uses the existing R2 binding as an upload fallback', () => {
  assert.match(serverSource, /const uploadStorage = env\.UPLOADS \|\| env\.BACKUPS/);
  assert.match(serverSource, /uploadStorage\.get\(key\)/);
  assert.match(serverSource, /uploadStorage\.put\(objectKey/);
});

test('premium cards use the expanded responsive grid rotation component', () => {
  assert.match(mainSource, /<PremiumAdCarousel items=\{orderedPromoted\} renderCard=\{renderPortalCard\}/);
  assert.match(mainSource, /<PremiumAdCarousel items=\{promotedJobs\}/);
  assert.match(mainSource, /const latestStandardJobs = useMemo/);
  assert.match(mainSource, /지금 주목할 메인 광고/);
  assert.match(mainSource, /getAdTierPresentation\(job\.adTier\)\?\.key === 'main'/);
  assert.match(mainSource, /getAdTierPresentation\(job\.adTier\)\?\.key !== 'main'/);
  assert.match(mainSource, /베이직 광고 초빙공고/);
  assert.match(mainSource, /function useServerSyncedSavedItems/);
  assert.match(mainSource, /loadSavedFromServer\(kind\)/);
  assert.doesNotMatch(mainSource, /AD · 병원 브랜드 광고/);
  assert.doesNotMatch(mainSource, /AD · 병원 브랜드 채용관/);
  assert.doesNotMatch(mainSource, /DEMO · 가상 공고/);
  assert.doesNotMatch(mainSource, /광고 디자인 예시 · 공식 로고 아님/);
  assert.match(mainSource, /PREMIUM_GRID_SLOTS = \{ mobile: 2, tablet: 4, desktop: 6 \}/);
});

test('home and jobs cards open a shareable full-page JobDetail route', () => {
  assert.match(mainSource, /navigate\(`\/jobs\/\$\{encodeURIComponent\(job\.id\)\}`\)/);
  assert.match(mainSource, /page = job \? <JobDetailRoute job=\{job\} qa=\{qa\} auth=\{auth\} \/>/);
  assert.doesNotMatch(mainSource, /setSelectedJob\(job\)/);
});

test('hospital job checkout uploads selected images before creating its payment order', () => {
  assert.match(uploadSource, /fetch\(withBase\('\/api\/uploads'\)/);
  assert.match(uploadSource, /'x-upload-purpose': purpose/);
  assert.match(mainSource, /await uploadJobImage\(brandFile, "banner"\)/);
  assert.match(mainSource, /facilityPhotos\.map\(\(photo\) => uploadJobImage\(photo\.file, "facility"\)\)/);
  assert.match(mainSource, /data\.hospitalPhotoUrls = hospitalPhotoUrls/);
});

test('hospital job checkout uploads web posters with preview and removal controls', () => {
  assert.match(mainSource, /웹포스터·홍보 이미지/);
  assert.match(mainSource, /posterImages\.map\(\(image\) => uploadJobImage\(image\.file, "poster"\)\)/);
  assert.match(mainSource, /data\.posterImageUrls = posterImageUrls/);
  assert.match(mainSource, /removePosterImage\(index\)/);
  assert.match(serverSource, /purposeRaw === 'poster'/);
});

test('hospital job records retain uploaded image URLs for public cards', () => {
  assert.match(serverSource, /const usesSingleBrandBanner = meta\.premiumBrandMode === 'single-brand-image'/);
  assert.match(serverSource, /const banner = usesSingleBrandBanner \? singleBrandImage/);
  assert.match(serverSource, /brandImageLayout,/);
  assert.match(serverSource, /facilityPhotos,/);
  assert.match(serverSource, /facility,/);
});

test('hospital job records retain up to three poster images for public details', () => {
  assert.match(serverSource, /const posterImages = Array\.isArray\(meta\.posterImageUrls\)/);
  assert.match(serverSource, /slice\(0, 3\)/);
  assert.match(serverSource, /posterImages,/);
  assert.match(mainSource, /className="job-poster-detail"/);
});

test('public doctor job mapping carries facility and poster galleries to JobDetail', () => {
  const operationsSource = readFileSync(new URL('./siteOperations.js', import.meta.url), 'utf8');
  assert.match(operationsSource, /hospitalPhotos:Array\.isArray\(p\.facilityPhotos\)/);
  assert.match(operationsSource, /posterImages:Array\.isArray\(p\.posterImages\)/);
});

test('hospital job checkout can persist a selected sample banner', () => {
  assert.match(mainSource, /const SAMPLE_BANNER_TEMPLATES = \[/);
  assert.match(mainSource, /data\.banner = brandImageUrl \|\| brandTemplate/);
  assert.match(mainSource, /premiumBrandMode: brandFile \? "single-brand-image" : brandTemplate \? "sample-banner"/);
  assert.match(serverSource, /cleanOrderValue\(meta\.banner/);
});

test('single uploaded brand artwork fills the card banner and legacy orders migrate once', () => {
  assert.match(mainSource, /data\.logo = ""/);
  assert.match(mainSource, /data\.brandImageLayout = brandImageUrl/);
  assert.match(mainSource, /job\.brandImageLayout === "full-banner"/);
  assert.match(serverSource, /async function migrateSingleBrandImageBanners/);
  assert.match(serverSource, /migration_single_brand_banner_v1/);
  assert.match(serverSource, /'\$\.brandImageLayout', 'full-banner'/);
  assert.match(serverSource, /await migrateSingleBrandImageBanners\(env\)/);
});

test('job detail displays the selected banner in its hero heading', () => {
  assert.match(mainSource, /const detailBanner = job\.banner \|\| job\.cardBanner/);
  assert.match(mainSource, /className="detail-hero-banner"/);
});

test('job detail never shrinks its wide banner into the square institution mark', () => {
  assert.match(mainSource, /const detailLogo = job\.logo && job\.logo !== detailBanner \? job\.logo : ""/);
  assert.match(mainSource, /className="detail-institution-mark"/);
  assert.match(mainSource, /source=\{detailLogo\} fit="mark"/);
});

test('Sites package serves all sample banner templates', () => {
  for (const name of [
    'medical-blue-v1.jpg',
    'wellness-mint-v1.jpg',
    'diagnostic-navy-v1.jpg',
    'care-lavender-v1.jpg',
    'rehab-coral-v1.jpg',
    'surgical-teal-v1.jpg',
  ]) {
    assert.ok(serverSource.includes(`/banners/templates/${name}`), `${name} route is missing`);
  }
});

test('resume API returns every account-owned resume for submission choice', () => {
  assert.match(serverSource, /FROM resumes WHERE account_id = \? ORDER BY updated_at DESC LIMIT 20/);
  assert.match(serverSource, /return json\(\{ signedIn:true, resumes, resume:resumes\[0\] \|\| null \}\)/);
});

test('consultation resume attachment is owner checked and snapshotted on the server', () => {
  assert.match(serverSource, /FROM resumes WHERE id = \? AND account_id = \? LIMIT 1/);
  assert.match(serverSource, /payload\.resumeSnapshot = \{/);
  assert.match(serverSource, /payload\.resumeTitle = resume\.title/);
});

test('doctor consultation and job application can select a saved resume', () => {
  assert.match(resumePickerSource, /등록 이력서 선택/);
  assert.match(resumePickerSource, /result\?\.resumes/);
  assert.match(requestPageSource, /<ResumeSubmitPicker selectedId=\{selectedResumeId\}/);
  assert.match(mainSource, /role === 'doctor' && <ResumeSubmitPicker selectedId=\{selectedResumeId\}/);
});

test('doctor resume photo uploads to protected profile storage', () => {
  assert.match(resumePhotoSource, /'x-upload-purpose':'resume-profile'/);
  assert.match(resumePhotoSource, /RESUME_PHOTO_MAX_BYTES = 5 \* 1024 \* 1024/);
  assert.match(resumePageSource, /await uploadResumePhoto\(photoFile\)/);
  assert.match(resumePageSource, /detail: \{ region:form\.region, salary:form\.salary, introduction:form\.introduction, photoUrl, contactVisibility:'private' \}/);
  assert.match(serverSource, /isResumeProfile \? 'profiles\/' : 'hospitals\/'/);
  assert.match(serverSource, /이력서 사진은 의료인 회원 본인만 업로드/);
  assert.match(serverSource, /key\.indexOf\('profiles\/'\) === 0 \? 'private, no-store'/);
});
