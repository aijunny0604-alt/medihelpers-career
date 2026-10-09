// Maps observed legacy service settings onto protected drafts only.
// Does not publish, insert payment orders, or grant member entitlements.
export function mapLegacyAdService(record, observation) {
  if (record.status !== 'draft' || record.visibility !== 'admin'
    || record.id !== `rankup-job-${observation.sourceId}`) throw Error('LEGACY_AD_NOT_PROTECTED');
  const payload=JSON.parse(record.payloadJson);
  if (!payload.migration?.ownerMapping?.accountId) throw Error('LEGACY_OWNER_UNRESOLVED');
  for(const key of ['adTier','adProductName','exposure','exposureEnd']) {
    if(payload[key]!==undefined && payload[key]!==null && payload[key]!=='') throw Error('LEGACY_AD_EDIT_CONFLICT');
  }
  const matches=[...String(observation.row || '').matchAll(/(?:^|\n)\s*(프리미엄배너|프리미엄로고|프리미엄우대)\s*:\s*(무기한|\d{4}\.\d{2}\.\d{2}~\d{4}\.\d{2}\.\d{2})\s*(?=\n|$)/g)];
  if(matches.length!==1) throw Error('LEGACY_AD_SERVICE_AMBIGUOUS');
  const [,service,period]=matches[0];
  let start='',end='';
  if(period!=='무기한') {
    [start,end]=period.replaceAll('.','-').split('~');
    const valid=d=>Number.isFinite(Date.parse(d+'T00:00:00Z')) && new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
    if(!valid(start)||!valid(end)||start>end)throw Error('LEGACY_AD_PERIOD_INVALID');
  }
  return {...payload,adTier:'featured',adProductName:`기존 ${service}`,exposureEnd:end,
    ...(start?{exposure:{start,end,days:Math.round((Date.parse(end)-Date.parse(start))/86400000)+1}}:{}),
    migration:{...payload.migration,legacyAdService:{service,sourcePeriod:period,start,end,timezone:'Asia/Seoul',unlimited:period==='무기한',source:'rankup-admin-service-observation',mappedAs:'featured',newCharge:false}}};
}
