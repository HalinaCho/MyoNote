(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,20414,62479,44861,35254,e=>{"use strict";var t=e.i(43476),r=e.i(71645);function a(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function o(e){let[t,r,a]=e.split("-").map(Number);return new Date(t,r-1,a)}function n(){return a(new Date)}function l(e,t){return e?.treatments?e.treatments.filter(e=>(e.periods??[]).some(e=>e.s<=t&&(null==e.e||t<=e.e))):[]}function i(e,t,r){let n=o(r);n.setDate(n.getDate()-1);let l=a(n),i=[];for(let a of e){let e=t.find(e=>e.key===a.key),o=[...a.periods??[]],n=o.findIndex(e=>null==e.e);e&&n<0?o.push({s:r,e:null}):!e&&n>=0&&(o=o[n].s>l?o.filter((e,t)=>t!==n):o.map((e,t)=>t===n?{...e,e:l}:e)),0!==o.length&&i.push({...a,name:e?.name??a.name,schedule:e?.schedule??a.schedule,periods:o})}for(let a of t)e.some(e=>e.key===a.key)||i.push({key:a.key,name:a.name,preset:a.preset,schedule:a.schedule,periods:[{s:r,e:null}]});return i}e.s(["calcAgeLabel",0,function(e){let t;return`만 ${t=o(e),Math.floor((new Date().getTime()-t.getTime())/315576e5)}세`},"formatDate",0,a,"parseDate",0,o,"today",0,n],62479),e.s(["TREATMENT_PRESETS",0,[{preset:"atropine",name:"아트로핀 점안",schedule:"취침 전 1회"},{preset:"dreamlens",name:"드림렌즈",schedule:"취침 시"}],"getActiveTreatments",0,l,"makeTreatmentKey",0,function(){return`c_${crypto.randomUUID().slice(0,8)}`},"mergeTreatments",0,i],44861);var s=e.i(11795);let d=(e,t)=>e.some(e=>e.preset===t&&(e.periods??[]).some(e=>null==e.e));async function c(){let e=(0,s.createClient)(),{data:t,error:r}=await e.from("eyebody_child_guardians").select("role, eyebody_children(id, name, birth_date, gender, treatments, outdoor_goal, phone_goal)").order("created_at",{ascending:!0});if(r)throw r;return(t??[]).map(e=>({id:e.eyebody_children.id,name:e.eyebody_children.name,birth:e.eyebody_children.birth_date,gender:e.eyebody_children.gender,treatments:e.eyebody_children.treatments??[],role:e.role,outdoorGoal:e.eyebody_children.outdoor_goal??2,phoneGoal:e.eyebody_children.phone_goal??2}))}async function u(e){let t=(0,s.createClient)(),{data:r,error:a}=await t.rpc("create_child",{p_name:e.name,p_birth:e.birth,p_gender:e.gender,p_treatments:e.treatments,p_treat_atropine:d(e.treatments,"atropine"),p_treat_dreamlens:d(e.treatments,"dreamlens"),p_outdoor_goal:e.outdoorGoal??2,p_phone_goal:e.phoneGoal??2});if(a)throw a;return{id:r,...e,outdoorGoal:e.outdoorGoal??2,phoneGoal:e.phoneGoal??2,role:"owner"}}async function p(e){let t=(0,s.createClient)(),{error:r}=await t.from("eyebody_children").update({name:e.name,birth_date:e.birth,gender:e.gender,treatments:e.treatments,treat_atropine:d(e.treatments,"atropine"),treat_dreamlens:d(e.treatments,"dreamlens"),outdoor_goal:e.outdoorGoal??2,phone_goal:e.phoneGoal??2}).eq("id",e.id);if(r)throw r}async function f(e){let t=(0,s.createClient)(),{error:r}=await t.from("eyebody_children").delete().eq("id",e);if(r)throw r}async function m(e){let t=(0,s.createClient)(),[r,a,o]=await Promise.all([t.from("eyebody_exam_records").select("id,exam_date,clinic,ax_od,ax_os,sph_od,sph_os,cyl_od,cyl_os,ser_od,ser_os,note,next_appointment").eq("child_id",e).order("exam_date",{ascending:!1}),t.from("eyebody_treatment_logs").select("log_date, done, atropine, dreamlens").eq("child_id",e),t.from("eyebody_activity_logs").select("log_date, outdoor_hours, phone_hours, sleep_hours").eq("child_id",e)]),n=(r.data??[]).map(e=>({id:e.id,date:e.exam_date,clinic:e.clinic??"",axOD:null!=e.ax_od?String(e.ax_od):"",axOS:null!=e.ax_os?String(e.ax_os):"",sphOD:null!=e.sph_od?String(e.sph_od):"",sphOS:null!=e.sph_os?String(e.sph_os):"",cylOD:null!=e.cyl_od?String(e.cyl_od):"",cylOS:null!=e.cyl_os?String(e.cyl_os):"",serOD:null!=e.ser_od?String(e.ser_od):"",serOS:null!=e.ser_os?String(e.ser_os):"",note:e.note??"",nextAppointment:e.next_appointment??""}));return{exams:n,logs:Object.fromEntries((a.data??[]).map(e=>{let t=e.done??{...e.atropine?{atropine:!0}:{},...e.dreamlens?{dreamlens:!0}:{}};return[e.log_date,t]})),lifestyle:Object.fromEntries((o.data??[]).map(e=>[e.log_date,{outdoor:parseFloat(e.outdoor_hours),phone:parseFloat(e.phone_hours),sleep:parseFloat(e.sleep_hours)}]))}}async function h(e,t,r){let a=(0,s.createClient)(),{error:o}=await a.from("eyebody_treatment_logs").upsert({child_id:e,log_date:t,done:r,atropine:!!r.atropine,dreamlens:!!r.dreamlens},{onConflict:"child_id,log_date"});if(o)throw o}async function y(e,t){let r=(0,s.createClient)(),a=t.sphOD?parseFloat(t.sphOD):null,o=t.sphOS?parseFloat(t.sphOS):null,n=t.cylOD?parseFloat(t.cylOD):null,l=t.cylOS?parseFloat(t.cylOS):null,{data:i,error:d}=await r.from("eyebody_exam_records").insert({child_id:e,exam_date:t.date,clinic:t.clinic||null,ax_od:t.axOD?parseFloat(t.axOD):null,ax_os:t.axOS?parseFloat(t.axOS):null,sph_od:a,sph_os:o,cyl_od:n,cyl_os:l,ser_od:null!=a?a+(n??0)/2:null,ser_os:null!=o?o+(l??0)/2:null,note:t.note||null,next_appointment:t.nextAppointment||null}).select().single();if(d)throw d;return{id:i.id,date:i.exam_date,clinic:i.clinic??"",axOD:null!=i.ax_od?String(i.ax_od):"",axOS:null!=i.ax_os?String(i.ax_os):"",sphOD:null!=i.sph_od?String(i.sph_od):"",sphOS:null!=i.sph_os?String(i.sph_os):"",cylOD:null!=i.cyl_od?String(i.cyl_od):"",cylOS:null!=i.cyl_os?String(i.cyl_os):"",serOD:null!=i.ser_od?String(i.ser_od):"",serOS:null!=i.ser_os?String(i.ser_os):"",note:i.note??"",nextAppointment:i.next_appointment??""}}async function g(e,t){let r=(0,s.createClient)(),a=t.sphOD?parseFloat(t.sphOD):null,o=t.sphOS?parseFloat(t.sphOS):null,n=t.cylOD?parseFloat(t.cylOD):null,l=t.cylOS?parseFloat(t.cylOS):null,{data:i,error:d}=await r.from("eyebody_exam_records").update({exam_date:t.date,clinic:t.clinic||null,ax_od:t.axOD?parseFloat(t.axOD):null,ax_os:t.axOS?parseFloat(t.axOS):null,sph_od:a,sph_os:o,cyl_od:n,cyl_os:l,ser_od:null!=a?a+(n??0)/2:null,ser_os:null!=o?o+(l??0)/2:null,note:t.note||null,next_appointment:t.nextAppointment||null}).eq("id",e).select().single();if(d)throw d;return{id:i.id,date:i.exam_date,clinic:i.clinic??"",axOD:null!=i.ax_od?String(i.ax_od):"",axOS:null!=i.ax_os?String(i.ax_os):"",sphOD:null!=i.sph_od?String(i.sph_od):"",sphOS:null!=i.sph_os?String(i.sph_os):"",cylOD:null!=i.cyl_od?String(i.cyl_od):"",cylOS:null!=i.cyl_os?String(i.cyl_os):"",serOD:null!=i.ser_od?String(i.ser_od):"",serOS:null!=i.ser_os?String(i.ser_os):"",note:i.note??"",nextAppointment:i.next_appointment??""}}async function _(e){let t=(0,s.createClient)(),{error:r}=await t.from("eyebody_exam_records").delete().eq("id",e);if(r)throw r}async function x(e,t,r){let a=(0,s.createClient)(),{error:o}=await a.from("eyebody_activity_logs").upsert({child_id:e,log_date:t,outdoor_hours:r.outdoor,phone_hours:r.phone,sleep_hours:r.sleep??0},{onConflict:"child_id,log_date"});if(o)throw o}async function b(e,t){let r=(0,s.createClient)(),{error:a}=await r.from("eyebody_activity_logs").delete().eq("child_id",e).eq("log_date",t);if(a)throw a}async function v(e){let t=(0,s.createClient)(),{data:r,error:a}=await t.rpc("get_child_guardians",{p_child_id:e});if(a)throw a;return(r??[]).map(e=>({userId:e.user_id,role:e.role,displayName:e.display_name||e.email?.split("@")[0]||"알 수 없음",email:e.email||""}))}async function w(e,t){let r=(0,s.createClient)(),{error:a}=await r.from("eyebody_child_guardians").delete().eq("child_id",e).eq("user_id",t);if(a)throw a}async function S(e,t="editor"){let r=(0,s.createClient)(),{data:a,error:o}=await r.rpc("create_invite_code",{p_child_id:e,p_role:t});if(o)throw Error(o.message||"코드 생성에 실패했습니다");return a}async function C(e){let t=(0,s.createClient)(),{data:r,error:a}=await t.rpc("accept_invite_code",{p_code:e.toUpperCase().trim()});if(a)throw Error(a.message||"코드 참여에 실패했습니다");return r}e.s(["acceptInviteCode",0,C,"addChild",0,u,"createInviteCode",0,S,"deleteChild",0,f,"deleteExam",0,_,"deleteLifestyle",0,b,"fetchChildData",0,m,"fetchChildren",0,c,"fetchGuardians",0,v,"removeGuardian",0,w,"saveExam",0,y,"saveLifestyle",0,x,"saveTreatmentLog",0,h,"updateChild",0,p,"updateExam",0,g],35254);let O=(0,r.createContext)(null);e.s(["ChildProvider",0,function({children:e}){let[a,o]=(0,r.useState)([]),[s,d]=(0,r.useState)(null),[v,w]=(0,r.useState)({}),[S,C]=(0,r.useState)([]),[j,E]=(0,r.useState)({}),[D,k]=(0,r.useState)(!0),N=(0,r.useCallback)(async e=>{let t=await m(e);w(t.logs),C(t.exams),E(t.lifestyle)},[]),P=(0,r.useCallback)(async()=>{k(!0);try{let e=await c();o(e);let t=localStorage.getItem("mn_active"),r=e.find(e=>e.id===t)?.id??e[0]?.id??null;d(r),r&&(localStorage.setItem("mn_active",r),await N(r))}finally{k(!1)}},[N]);(0,r.useEffect)(()=>{P()},[P]);let T=(0,r.useCallback)(async e=>{d(e),localStorage.setItem("mn_active",e),await N(e)},[N]),$=a.find(e=>e.id===s)??null,A=l($,n()),F=(0,r.useCallback)(e=>l($,e),[$]),I=async e=>{let t=i([],e.treatments,n()),r=await u({...e,treatments:t});o(e=>[...e,r]),await T(r.id)},L=async e=>{let t=a.find(t=>t.id===e.id),r=i(t?.treatments??[],e.treatments,n()),l={...e,treatments:r};await p(l),o(t=>t.map(t=>t.id===e.id?{...t,...l}:t))},M=async e=>{await f(e);let t=a.filter(t=>t.id!==e);if(o(t),s===e){let e=t[0]?.id??null;d(e),e?(localStorage.setItem("mn_active",e),await N(e)):(w({}),C([]),E({}))}},R=async(e,t)=>{s&&(w(r=>({...r,[e]:t})),await h(s,e,t))},U=e=>[...e].sort((e,t)=>t.date.localeCompare(e.date)),z=async e=>{if(!s)throw Error("자녀를 선택해주세요");let t=await y(s,e);return C(e=>U([t,...e])),t},q=async(e,t)=>{let r=await g(e,t);C(t=>U(t.map(t=>t.id===e?r:t)))},G=async e=>{await _(e),C(t=>t.filter(t=>t.id!==e))},K=async(e,t)=>{s&&(E(r=>({...r,[e]:t})),await x(s,e,t))},B=async e=>{s&&(await b(s,e),E(t=>{let r={...t};return delete r[e],r}))};return(0,t.jsx)(O.Provider,{value:{children:a,activeChildId:s,activeChild:$,activeTreatments:A,treatmentsForDate:F,logs:v,exams:S,lifestyle:j,isLoading:D,switchChild:T,refreshChildren:P,addChild:I,updateChild:L,deleteChild:M,saveTreatmentLog:R,saveExam:z,updateExam:q,deleteExam:G,saveLifestyle:K,deleteLifestyle:B},children:e})},"useChild",0,function(){let e=(0,r.useContext)(O);if(!e)throw Error("useChild must be used within ChildProvider");return e}],20414)},5766,e=>{"use strict";let t,r;var a,o=e.i(71645);let n={data:""},l=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,i=/\/\*[^]*?\*\/|  +/g,s=/\n+/g,d=(e,t)=>{let r="",a="",o="";for(let n in e){let l=e[n];"@"==n[0]?"i"==n[1]?r=n+" "+l+";":a+="f"==n[1]?d(l,n):n+"{"+d(l,"k"==n[1]?"":t)+"}":"object"==typeof l?a+=d(l,t?t.replace(/([^,])+/g,e=>n.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+" "+t:t)):n):null!=l&&(n="-"==n[1]?n:n.replace(/[A-Z]/g,"-$&").toLowerCase(),o+=d.p?d.p(n,l):n+":"+l+";")}return r+(t&&o?t+"{"+o+"}":o)+a},c={},u=e=>{if("object"==typeof e){let t="";for(let r in e)t+=r+u(e[r]);return t}return e};function p(e){let t,r,a=this||{},o=e.call?e(a.p):e;return((e,t,r,a,o)=>{var n;let p=u(e),f=c[p]||(c[p]=(e=>{let t=0,r=11;for(;t<e.length;)r=101*r+e.charCodeAt(t++)>>>0;return"go"+r})(p));if(!c[f]){let t=p!==e?e:(e=>{let t,r,a=[{}];for(;t=l.exec(e.replace(i,""));)t[4]?a.shift():t[3]?(r=t[3].replace(s," ").trim(),a.unshift(a[0][r]=a[0][r]||{})):a[0][t[1]]=t[2].replace(s," ").trim();return a[0]})(e);c[f]=d(o?{["@keyframes "+f]:t}:t,r?"":"."+f)}let m=r&&c.g;return r&&(c.g=c[f]),n=c[f],m?t.data=t.data.replace(m,n):-1===t.data.indexOf(n)&&(t.data=a?n+t.data:t.data+n),f})(o.unshift?o.raw?(t=[].slice.call(arguments,1),r=a.p,o.reduce((e,a,o)=>{let n=t[o];if(n&&n.call){let e=n(r),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;n=t?"."+t:e&&"object"==typeof e?e.props?"":d(e,""):!1===e?"":e}return e+a+(null==n?"":n)},"")):o.reduce((e,t)=>Object.assign(e,t&&t.call?t(a.p):t),{}):o,(e=>{if("object"==typeof window){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||n})(a.target),a.g,a.o,a.k)}p.bind({g:1});let f,m,h,y=p.bind({k:1});function g(e,t){let r=this||{};return function(){let a=arguments;function o(n,l){let i=Object.assign({},n),s=i.className||o.className;r.p=Object.assign({theme:m&&m()},i),r.o=/go\d/.test(s),i.className=p.apply(r,a)+(s?" "+s:""),t&&(i.ref=l);let d=e;return e[0]&&(d=i.as||e,delete i.as),h&&d[0]&&h(i),f(d,i)}return t?t(o):o}}var _=(e,t)=>"function"==typeof e?e(t):e,x=(t=0,()=>(++t).toString()),b=()=>{if(void 0===r&&"u">typeof window){let e=matchMedia("(prefers-reduced-motion: reduce)");r=!e||e.matches}return r},v="default",w=(e,t)=>{let{toastLimit:r}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,r)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:a}=t;return w(e,{type:+!!e.toasts.find(e=>e.id===a.id),toast:a});case 3:let{toastId:o}=t;return{...e,toasts:e.toasts.map(e=>e.id===o||void 0===o?{...e,dismissed:!0,visible:!1}:e)};case 4:return void 0===t.toastId?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let n=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+n}))}}},S=[],C={toasts:[],pausedAt:void 0,settings:{toastLimit:20}},O={},j=(e,t=v)=>{O[t]=w(O[t]||C,e),S.forEach(([e,r])=>{e===t&&r(O[t])})},E=e=>Object.keys(O).forEach(t=>j(e,t)),D=(e=v)=>t=>{j(t,e)},k={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},N=e=>(t,r)=>{let a,o=((e,t="blank",r)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...r,id:(null==r?void 0:r.id)||x()}))(t,e,r);return D(o.toasterId||(a=o.id,Object.keys(O).find(e=>O[e].toasts.some(e=>e.id===a))))({type:2,toast:o}),o.id},P=(e,t)=>N("blank")(e,t);P.error=N("error"),P.success=N("success"),P.loading=N("loading"),P.custom=N("custom"),P.dismiss=(e,t)=>{let r={type:3,toastId:e};t?D(t)(r):E(r)},P.dismissAll=e=>P.dismiss(void 0,e),P.remove=(e,t)=>{let r={type:4,toastId:e};t?D(t)(r):E(r)},P.removeAll=e=>P.remove(void 0,e),P.promise=(e,t,r)=>{let a=P.loading(t.loading,{...r,...null==r?void 0:r.loading});return"function"==typeof e&&(e=e()),e.then(e=>{let o=t.success?_(t.success,e):void 0;return o?P.success(o,{id:a,...r,...null==r?void 0:r.success}):P.dismiss(a),e}).catch(e=>{let o=t.error?_(t.error,e):void 0;o?P.error(o,{id:a,...r,...null==r?void 0:r.error}):P.dismiss(a)}),e};var T=1e3,$=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,A=y`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,F=y`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,I=g("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${$} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${A} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${F} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,L=y`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,M=g("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${L} 1s linear infinite;
`,R=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,U=y`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,z=g("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${R} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${U} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,q=g("div")`
  position: absolute;
`,G=g("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,K=y`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,B=g("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${K} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,H=({toast:e})=>{let{icon:t,type:r,iconTheme:a}=e;return void 0!==t?"string"==typeof t?o.createElement(B,null,t):t:"blank"===r?null:o.createElement(G,null,o.createElement(M,{...a}),"loading"!==r&&o.createElement(q,null,"error"===r?o.createElement(I,{...a}):o.createElement(z,{...a})))},W=g("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,X=g("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Y=o.memo(({toast:e,position:t,style:r,children:a})=>{let n=e.height?((e,t)=>{let r=e.includes("top")?1:-1,[a,o]=b()?["0%{opacity:0;} 100%{opacity:1;}","0%{opacity:1;} 100%{opacity:0;}"]:[`
0% {transform: translate3d(0,${-200*r}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${-150*r}%,-1px) scale(.6); opacity:0;}
`];return{animation:t?`${y(a)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${y(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}})(e.position||t||"top-center",e.visible):{opacity:0},l=o.createElement(H,{toast:e}),i=o.createElement(X,{...e.ariaProps},_(e.message,e));return o.createElement(W,{className:e.className,style:{...n,...r,...e.style}},"function"==typeof a?a({icon:l,message:i}):o.createElement(o.Fragment,null,l,i))});a=o.createElement,d.p=void 0,f=a,m=void 0,h=void 0;var J=({id:e,className:t,style:r,onHeightUpdate:a,children:n})=>{let l=o.useCallback(t=>{if(t){let r=()=>{a(e,t.getBoundingClientRect().height)};r(),new MutationObserver(r).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,a]);return o.createElement("div",{ref:l,className:t,style:r},n)},Q=p`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;e.s(["Toaster",0,({reverseOrder:e,position:t="top-center",toastOptions:r,gutter:a,children:n,toasterId:l,containerStyle:i,containerClassName:s})=>{let{toasts:d,handlers:c}=((e,t="default")=>{let{toasts:r,pausedAt:a}=((e={},t=v)=>{let[r,a]=(0,o.useState)(O[t]||C),n=(0,o.useRef)(O[t]);(0,o.useEffect)(()=>(n.current!==O[t]&&a(O[t]),S.push([t,a]),()=>{let e=S.findIndex(([e])=>e===t);e>-1&&S.splice(e,1)}),[t]);let l=r.toasts.map(t=>{var r,a,o;return{...e,...e[t.type],...t,removeDelay:t.removeDelay||(null==(r=e[t.type])?void 0:r.removeDelay)||(null==e?void 0:e.removeDelay),duration:t.duration||(null==(a=e[t.type])?void 0:a.duration)||(null==e?void 0:e.duration)||k[t.type],style:{...e.style,...null==(o=e[t.type])?void 0:o.style,...t.style}}});return{...r,toasts:l}})(e,t),n=(0,o.useRef)(new Map).current,l=(0,o.useCallback)((e,t=T)=>{if(n.has(e))return;let r=setTimeout(()=>{n.delete(e),i({type:4,toastId:e})},t);n.set(e,r)},[]);(0,o.useEffect)(()=>{if(a)return;let e=Date.now(),o=r.map(r=>{if(r.duration===1/0)return;let a=(r.duration||0)+r.pauseDuration-(e-r.createdAt);if(a<0){r.visible&&P.dismiss(r.id);return}return setTimeout(()=>P.dismiss(r.id,t),a)});return()=>{o.forEach(e=>e&&clearTimeout(e))}},[r,a,t]);let i=(0,o.useCallback)(D(t),[t]),s=(0,o.useCallback)(()=>{i({type:5,time:Date.now()})},[i]),d=(0,o.useCallback)((e,t)=>{i({type:1,toast:{id:e,height:t}})},[i]),c=(0,o.useCallback)(()=>{a&&i({type:6,time:Date.now()})},[a,i]),u=(0,o.useCallback)((e,t)=>{let{reverseOrder:a=!1,gutter:o=8,defaultPosition:n}=t||{},l=r.filter(t=>(t.position||n)===(e.position||n)&&t.height),i=l.findIndex(t=>t.id===e.id),s=l.filter((e,t)=>t<i&&e.visible).length;return l.filter(e=>e.visible).slice(...a?[s+1]:[0,s]).reduce((e,t)=>e+(t.height||0)+o,0)},[r]);return(0,o.useEffect)(()=>{r.forEach(e=>{if(e.dismissed)l(e.id,e.removeDelay);else{let t=n.get(e.id);t&&(clearTimeout(t),n.delete(e.id))}})},[r,l]),{toasts:r,handlers:{updateHeight:d,startPause:s,endPause:c,calculateOffset:u}}})(r,l);return o.createElement("div",{"data-rht-toaster":l||"",style:{position:"fixed",zIndex:9999,top:16,left:16,right:16,bottom:16,pointerEvents:"none",...i},className:s,onMouseEnter:c.startPause,onMouseLeave:c.endPause},d.map(r=>{let l,i,s=r.position||t,d=c.calculateOffset(r,{reverseOrder:e,gutter:a,defaultPosition:t}),u=(l=s.includes("top"),i=s.includes("center")?{justifyContent:"center"}:s.includes("right")?{justifyContent:"flex-end"}:{},{left:0,right:0,display:"flex",position:"absolute",transition:b()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${d*(l?1:-1)}px)`,...l?{top:0}:{bottom:0},...i});return o.createElement(J,{id:r.id,key:r.id,onHeightUpdate:c.updateHeight,className:r.visible?Q:"",style:u},"custom"===r.type?_(r.message,r):n?n(r):o.createElement(Y,{toast:r,position:s}))}))},"default",0,P],5766)},18566,(e,t,r)=>{t.exports=e.r(76562)},95057,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={formatUrl:function(){return i},formatWithValidation:function(){return d},urlObjectKeys:function(){return s}};for(var o in a)Object.defineProperty(r,o,{enumerable:!0,get:a[o]});let n=e.r(90809)._(e.r(98183)),l=/https?|ftp|gopher|file/;function i(e){let{auth:t,hostname:r}=e,a=e.protocol||"",o=e.pathname||"",i=e.hash||"",s=e.query||"",d=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?d=t+e.host:r&&(d=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(d+=":"+e.port)),s&&"object"==typeof s&&(s=String(n.urlQueryToSearchParams(s)));let c=e.search||s&&`?${s}`||"";return a&&!a.endsWith(":")&&(a+=":"),e.slashes||(!a||l.test(a))&&!1!==d?(d="//"+(d||""),o&&"/"!==o[0]&&(o="/"+o)):d||(d=""),i&&"#"!==i[0]&&(i="#"+i),c&&"?"!==c[0]&&(c="?"+c),o=o.replace(/[?#]/g,encodeURIComponent),c=c.replace("#","%23"),`${a}${d}${o}${c}${i}`}let s=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function d(e){return i(e)}},18581,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return o}});let a=e.r(71645);function o(e,t){let r=(0,a.useRef)(null),o=(0,a.useRef)(null);return(0,a.useCallback)(a=>{if(null===a){let e=r.current;e&&(r.current=null,e());let t=o.current;t&&(o.current=null,t())}else e&&(r.current=n(e,a)),t&&(o.current=n(t,a))},[e,t])}function n(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},73668,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return n}});let a=e.r(18967),o=e.r(52817);function n(e){if(!(0,a.isAbsoluteUrl)(e))return!0;try{let t=(0,a.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,o.hasBasePath)(r.pathname)}catch(e){return!1}}},84508,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return a}});let a=e=>{}},22016,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={default:function(){return g},useLinkStatus:function(){return x}};for(var o in a)Object.defineProperty(r,o,{enumerable:!0,get:a[o]});let n=e.r(90809),l=e.r(43476),i=n._(e.r(71645)),s=e.r(95057),d=e.r(8372),c=e.r(18581),u=e.r(18967),p=e.r(5550);e.r(33525);let f=e.r(88540),m=e.r(91949),h=e.r(73668),y=e.r(9396);function g(t){var r,a;let o,n,g,[x,b]=(0,i.useOptimistic)(m.IDLE_LINK_STATUS),v=(0,i.useRef)(null),{href:w,as:S,children:C,prefetch:O=null,passHref:j,replace:E,shallow:D,scroll:k,onClick:N,onMouseEnter:P,onTouchStart:T,legacyBehavior:$=!1,onNavigate:A,transitionTypes:F,ref:I,unstable_dynamicOnHover:L,...M}=t;o=C,$&&("string"==typeof o||"number"==typeof o)&&(o=(0,l.jsx)("a",{children:o}));let R=i.default.useContext(d.AppRouterContext),U=!1!==O,z=!1!==O?null===(a=O)||"auto"===a?y.FetchStrategy.PPR:y.FetchStrategy.Full:y.FetchStrategy.PPR,q="string"==typeof(r=S||w)?r:(0,s.formatUrl)(r);if($){if(o?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});n=i.default.Children.only(o)}let G=$?n&&"object"==typeof n&&n.ref:I,K=i.default.useCallback(e=>(null!==R&&(v.current=(0,m.mountLinkInstance)(e,q,R,z,U,b)),()=>{v.current&&((0,m.unmountLinkForCurrentNavigation)(v.current),v.current=null),(0,m.unmountPrefetchableInstance)(e)}),[U,q,R,z,b]),B={ref:(0,c.useMergedRef)(K,G),onClick(t){$||"function"!=typeof N||N(t),$&&n.props&&"function"==typeof n.props.onClick&&n.props.onClick(t),!R||t.defaultPrevented||function(t,r,a,o,n,l,s){if("u">typeof window){let d,{nodeName:c}=t.currentTarget;if("A"===c.toUpperCase()&&((d=t.currentTarget.getAttribute("target"))&&"_self"!==d||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,h.isLocalURL)(r)){o&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),l){let e=!1;if(l({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:u}=e.r(99781);i.default.startTransition(()=>{u(r,o?"replace":"push",!1===n?f.ScrollBehavior.NoScroll:f.ScrollBehavior.Default,a.current,s)})}}(t,q,v,E,k,A,F)},onMouseEnter(e){$||"function"!=typeof P||P(e),$&&n.props&&"function"==typeof n.props.onMouseEnter&&n.props.onMouseEnter(e),R&&U&&(0,m.onNavigationIntent)(e.currentTarget,!0===L)},onTouchStart:function(e){$||"function"!=typeof T||T(e),$&&n.props&&"function"==typeof n.props.onTouchStart&&n.props.onTouchStart(e),R&&U&&(0,m.onNavigationIntent)(e.currentTarget,!0===L)}};return(0,u.isAbsoluteUrl)(q)?B.href=q:$&&!j&&("a"!==n.type||"href"in n.props)||(B.href=(0,p.addBasePath)(q)),g=$?i.default.cloneElement(n,B):(0,l.jsx)("a",{...M,...B,children:o}),(0,l.jsx)(_.Provider,{value:x,children:g})}e.r(84508);let _=(0,i.createContext)(m.IDLE_LINK_STATUS),x=()=>(0,i.useContext)(_);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},13918,e=>{"use strict";e.i(47167);var t=e.i(43476),r=e.i(71645),a=e.i(18566),o=e.i(5766),n=e.i(11795),l=e.i(20414),i=e.i(62479),s=e.i(49721),d=e.i(68757),c=e.i(22016);function u(){let{children:e,activeChild:a,activeChildId:o,switchChild:n}=(0,l.useChild)(),[u,p]=(0,r.useState)(!1);return(0,t.jsxs)("header",{className:"sticky top-0 z-30 bg-white border-b border-gray-100",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between px-4 h-14",children:[(0,t.jsxs)(c.default,{href:"/dashboard",className:"flex items-center gap-2",children:[(0,t.jsx)("img",{src:"https://HalinaCho.github.io/MyoNote/icon.png",alt:"",className:"h-9 w-auto"}),(0,t.jsx)("span",{className:"font-bold text-teal-500 text-lg",children:"마이오노트"})]}),(0,t.jsxs)("button",{onClick:()=>p(e=>!e),className:"flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-700",children:[a?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("span",{children:"F"===a.gender?"👧":"👦"}),(0,t.jsx)("span",{children:a.name})]}):(0,t.jsx)("span",{className:"text-gray-400",children:"자녀 선택"}),(0,t.jsx)(s.FontAwesomeIcon,{icon:u?d.faChevronUp:d.faChevronDown,className:"text-gray-400 text-xs"})]})]}),u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("div",{className:"fixed inset-0 z-20",onClick:()=>p(!1)}),(0,t.jsxs)("div",{className:"absolute right-4 top-14 z-30 w-52 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden",children:[e.map(e=>(0,t.jsxs)("button",{onClick:()=>{n(e.id),p(!1)},className:`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors
                  ${e.id===o?"bg-teal-50 text-teal-700":"text-gray-700"}`,children:[(0,t.jsx)("span",{className:"text-base",children:"F"===e.gender?"👧":"👦"}),(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"font-semibold",children:e.name}),(0,t.jsx)("div",{className:"text-xs text-gray-400",children:(0,i.calcAgeLabel)(e.birth)})]}),e.id===o&&(0,t.jsx)(s.FontAwesomeIcon,{icon:d.faCheck,className:"ml-auto text-teal-600 text-xs"})]},e.id)),(0,t.jsx)("div",{className:"border-t border-gray-100"}),(0,t.jsxs)("button",{onClick:()=>{p(!1),document.dispatchEvent(new CustomEvent("open-add-child"))},className:"w-full flex items-center gap-3 px-4 py-3 text-sm text-teal-600 hover:bg-teal-50 transition-colors",children:[(0,t.jsx)(s.FontAwesomeIcon,{icon:d.faPlus})," 자녀 추가"]})]})]})]})}let p=[{href:"/dashboard",label:"홈",icon:d.faHouse},{href:"/dashboard/calendar",label:"캘린더",icon:d.faCalendarDays},{href:"/dashboard/records",label:"검사",icon:d.faMicroscope},{href:"/dashboard/analytics",label:"분석",icon:d.faChartColumn},{href:"/dashboard/settings",label:"설정",icon:d.faGear}];function f(){let e=(0,a.usePathname)();return(0,t.jsx)("nav",{className:"fixed bottom-0 inset-x-0 z-40 flex justify-center",children:(0,t.jsx)("div",{className:"w-full max-w-[480px] flex bg-white border-t border-gray-200 safe-pb",children:p.map(({href:r,label:a,icon:o})=>{let n="/dashboard"===r?e===r:e.startsWith(r);return(0,t.jsxs)(c.default,{href:r,className:`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors
                ${n?"text-teal-600":"text-gray-400"}`,children:[(0,t.jsx)(s.FontAwesomeIcon,{icon:o,className:"text-xl leading-none"}),(0,t.jsx)("span",{className:`font-medium ${n?"font-semibold":""}`,children:a})]},r)})})})}e.s(["default",0,function({children:e}){let i=(0,a.useRouter)(),[s,d]=(0,r.useState)(!1);return((0,r.useEffect)(()=>{(0,n.createClient)().auth.getSession().then(({data:{session:e}})=>{e?d(!0):window.location.replace("https://HalinaCho.github.io/MyoNote/login")})},[i]),s)?(0,t.jsxs)(l.ChildProvider,{children:[(0,t.jsx)("div",{className:"flex justify-center min-h-screen bg-[#d9efed]",children:(0,t.jsxs)("div",{className:"relative w-full max-w-[480px] min-h-screen flex flex-col bg-[#edf7f6]",children:[(0,t.jsx)(u,{}),(0,t.jsx)("main",{className:"flex-1 overflow-y-auto pb-20 px-4 py-3",children:e}),(0,t.jsx)(f,{})]})}),(0,t.jsx)(o.Toaster,{position:"bottom-center",toastOptions:{style:{maxWidth:360,fontSize:14},duration:2200,success:{iconTheme:{primary:"#14b8a6",secondary:"#fff"}}}})]}):null}],13918)}]);