import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inicisPost,inicisMobilePost,inquireInicisCard} from './inicisStandard.js';

// Workers rejects redirect:'error'. Manual must never follow or parse a 3xx.
for (const status of [301,302,303,307,308]) {
  for (const adapter of ['standard','mobile','inquiry']) {
    test(`${adapter} rejects HTTP ${status} without reading or following redirect`, async()=>{
      let calls=0;
      const fetcher=async(url,options)=>{
        calls++;
        assert.equal(options.redirect,'manual');
        return {ok:false,status,headers:new Headers({location:'https://untrusted.example/'}),
          text(){throw Error('BODY_MUST_NOT_BE_READ');},json(){throw Error('BODY_MUST_NOT_BE_READ');}};
      };
      const run=adapter==='standard' ? ()=>inicisPost('https://stgstdpay.inicis.com/api/payAuth',{},fetcher)
        : adapter==='mobile' ? ()=>inicisMobilePost('https://stgmobile.inicis.com/smart/payReq.ini',{},fetcher)
        : ()=>inquireInicisCard({INICIS_ENV:'test',INICIS_MID:'INIpayTest',INICIS_API_KEY:'synthetic',INICIS_CLIENT_IP:'192.0.2.1'},
          {orderNumber:'TEST',totalAmount:100,status:'paid'},'T'.repeat(40),fetcher);
      await assert.rejects(run,/PG_HTTP_ERROR/);
      assert.equal(calls,1);
    });
  }
}
