// Build a media/name candidate. This never publishes content or grants rights.
export function mapLegacyJobMedia(record, placement, manifest, featuredSlot = '') {
  if (!/^rankup-job-[1-9][0-9]*$/.test(record.id || '') || record.id !== placement.id
      || record.status !== 'draft' || record.visibility !== 'admin') throw Error('LEGACY_RECORD_NOT_PROTECTED');
  if (placement.sourceState !== 'available') throw Error('LEGACY_SOURCE_UNAVAILABLE');
  const original=JSON.parse(record.payloadJson);
  if (!original.migration?.ownerMapping?.accountId) throw Error('LEGACY_OWNER_UNRESOLVED');
  const known=new Set(manifest.filter(item=>item.assetPath===`/legacy-media/${item.sha256}.${item.assetPath.split('.').at(-1)}`
    && /^\/legacy-media\/[a-f0-9]{64}\.(png|jpg|jpeg|gif|webp|bmp)$/.test(item.assetPath)).map(item=>item.assetPath));
  const group=key=>{
    const values=placement.roles?.[key];
    if (!Array.isArray(values) || values.some(path=>!known.has(path))) throw Error('LEGACY_MEDIA_UNVERIFIED');
    return [...new Set(values)];
  };
  const logos=group('logo'),photos=group('gallery'),posters=group('body');
  if (logos.length>1 || photos.length>6) throw Error('LEGACY_MEDIA_LAYOUT_AMBIGUOUS');
  const fields={};
  if (logos.length) {
    if(featuredSlot==='premium-banner') Object.assign(fields,{banner:logos[0],brandImageLayout:'full-banner'});
    else fields.logo=logos[0];
  }
  if (photos.length) fields.facilityPhotos=photos;
  if (posters.length) fields.posterImages=posters;
  for (const [key,value] of Object.entries(fields)) {
    const current=original[key];
    const occupied=Array.isArray(current)?current.length>0:current!==undefined&&current!==null&&current!=='';
    if (occupied && JSON.stringify(current)!==JSON.stringify(value)) throw Error('LEGACY_MEDIA_EDIT_CONFLICT');
  }
  const updated={...original,...fields};
  const sourceName=typeof placement.hospitalName==='string'?placement.hospitalName.trim():'';
  if (sourceName.length>200) throw Error('LEGACY_HOSPITAL_NAME_INVALID');
  const subtitle=record.subtitle || sourceName;
  if(record.subtitle && sourceName && record.subtitle.trim()!==sourceName) throw Error('LEGACY_HOSPITAL_NAME_CONFLICT');
  return {id:record.id,fields,subtitle,payloadJson:JSON.stringify(updated),changed:subtitle!==(record.subtitle||'')||Object.keys(fields).some(key=>JSON.stringify(original[key])!==JSON.stringify(fields[key]))};
}
