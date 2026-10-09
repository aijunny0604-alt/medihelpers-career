import React,{useState} from 'react';
import {withBase} from './basePath.js';
export default function PaymentLedgerDownload(){
 const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 const [start,setStart]=useState(today),[end,setEnd]=useState(today),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function download(event){
  event.preventDefault();setBusy(true);setMessage('');
  try{
   const response=await fetch(withBase('/api/admin-payment-ledger?'+new URLSearchParams({start,end})),{credentials:'same-origin',cache:'no-store'});
   if(!response.ok){const result=await response.json();throw Error(result.error);}
   const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='medihelpers-ledger-'+start+'-'+end+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
   setMessage('원장을 내려받았습니다. 이니시스 거래번호·금액·취소 상태와 대조해주세요.');
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 return <form className="payment-ledger-download" onSubmit={download}>
  <strong>이니시스 내역 대조용 원장</strong>
  <p>홈페이지에 기록된 날짜(한국 시각)를 기준으로 승인·취소 내역을 내려받습니다. 이니시스에서만 취소된 거래는 포함되지 않으므로 양쪽 거래번호를 대조해주세요. 최대 31일이며 고객 연락처는 제외합니다.</p>
  <div><label>원장 시작일<input required type="date" value={start} onChange={e=>setStart(e.target.value)} /></label><label>원장 종료일<input required type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)} /></label><button className="button outline" type="submit" disabled={busy}>{busy?'준비 중…':'대조용 CSV 내려받기'}</button></div>
  {message&&<p role="status">{message}</p>}
 </form>;
}
