import assert from 'node:assert/strict';

// Offline SQLite rehearsal only. Never accepts credentials or opens a remote DB.
export function applyProtectedMediaPlan(db, changes, reverse=false) {
  const ids=new Set(), allowed=new Set(['banner','logo','brandImageLayout','facilityPhotos','posterImages']);
  for(const c of changes){
    assert.match(c.id,/^rankup-job-[1-9][0-9]*$/);
    assert.ok(!ids.has(c.id),'Duplicate record');ids.add(c.id);
    const before=JSON.parse(c.expectedPayloadJson),after=JSON.parse(c.payloadJson);
    assert.ok(before.migration?.ownerMapping?.accountId,'Unresolved owner');
    for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
      if(!allowed.has(key))assert.deepEqual(after[key],before[key],'Unexpected field change: '+key);
    }
  }
  const update=db.prepare("UPDATE admin_content_records SET payload_json=?,subtitle=? WHERE id=? AND status='draft' AND visibility='admin' AND payload_json=? AND subtitle IS ?");
  db.exec('BEGIN IMMEDIATE');
  try{
    for(const c of changes){
      const target=reverse?[c.expectedPayloadJson,c.expectedSubtitle]:[c.payloadJson,c.subtitle];
      const expected=reverse?[c.payloadJson,c.subtitle]:[c.expectedPayloadJson,c.expectedSubtitle];
      assert.equal(update.run(...target,c.id,...expected).changes,1,'Protected media conflict: '+c.id);
    }
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}
