// Embed this self-contained function in the generated Worker. No schema mutations.
export async function runBoundedD1Retention(env) {
  if (!env?.DB || env.D1_UPLOADS_ENABLED !== 'true' || env.D1_RETENTION_ENABLED !== 'true' || env.UPLOADS || env.BACKUPS) return {skipped:'disabled-or-other-storage'};
  if (env.STAGING_READ_ONLY === 'true' || (env.MIGRATION_MODE || 'open') !== 'open') return {skipped:'read-only-or-maintenance'};
  const db=env.DB;
  const expired="julianday(retention_until)<=julianday('now')";
  const records=await db.prepare('SELECT id FROM hospital_verification_requests WHERE '+expired+' ORDER BY retention_until,id LIMIT 5').all();
  const ids=(records.results||[]).map(r=>r.id);
  const statements=[];
  if(ids.length){
    const placeholders=ids.map(()=>'?').join(',');
    const targets='SELECT id FROM hospital_verification_requests WHERE id IN ('+placeholders+') AND '+expired;
    // Keep a newer submission's profile intact; all mutation predicates recheck expiry.
    statements.push(db.prepare("UPDATE member_registration_profiles SET profile_json=json_set(profile_json,'$.hospitalDocument',json_object('status','expired','deletedAt',strftime('%Y-%m-%dT%H:%M:%fZ','now'))),updated_at=CURRENT_TIMESTAMP WHERE EXISTS (SELECT 1 FROM hospital_verification_requests h WHERE h.account_id=member_registration_profiles.account_id AND h.id IN ("+targets+") AND NOT EXISTS (SELECT 1 FROM hospital_verification_requests newer WHERE newer.account_id=h.account_id AND newer.id<>h.id AND newer.submitted_at>=h.submitted_at))").bind(...ids));
    statements.push(db.prepare('DELETE FROM upload_objects WHERE object_key IN (SELECT document_key FROM hospital_verification_requests WHERE id IN ('+targets+')) AND NOT EXISTS (SELECT 1 FROM hospital_verification_requests other WHERE other.document_key=upload_objects.object_key AND other.id NOT IN ('+targets+'))').bind(...ids,...ids));
    statements.push(db.prepare('DELETE FROM hospital_verification_requests WHERE id IN ('+targets+')').bind(...ids));
  }
  // Orphan files get seven days to be attached. Unknown dates fail closed.
  // Re-evaluate references in the DELETE itself rather than a stale JS snapshot.
  statements.push(db.prepare("DELETE FROM upload_objects WHERE object_key IN (SELECT u.object_key FROM upload_objects u WHERE julianday(u.uploaded_at)<=julianday('now','-7 days') AND ((substr(u.object_key,1,9)='profiles/' AND NOT EXISTS (SELECT 1 FROM resumes r WHERE json_extract(r.detail_json,'$.photoUrl')='/api/uploads/'||u.object_key) AND NOT EXISTS (SELECT 1 FROM consultation_requests c WHERE json_extract(c.payload_json,'$.resumeSnapshot.detail.photoUrl')='/api/uploads/'||u.object_key)) OR (substr(u.object_key,1,24)='verifications/hospitals/' AND NOT EXISTS (SELECT 1 FROM hospital_verification_requests h WHERE h.document_key=u.object_key))) ORDER BY u.uploaded_at,u.object_key LIMIT 5)"));
  const id='retention-'+crypto.randomUUID();
  statements.push(db.prepare("INSERT INTO data_protection_runs(id,run_type,trigger_type,status,actor,detail_json,completed_at) VALUES(?,'retention','daily','succeeded','system',?,CURRENT_TIMESTAMP)").bind(id,JSON.stringify({scope:'bounded-d1-private-files',maxDocuments:5,maxOrphans:5})));
  // FK ON DELETE CASCADE removes chunks in the same transaction as file metadata.
  const results=await db.batch(statements);
  return {runId:id,expiredRecords:ids.length?Number(results[2]?.meta?.changes||0):0,orphanFiles:Number(results[results.length-2]?.meta?.changes||0)};
}
