(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,20414,35254,62479,e=>{"use strict";var t=e.i(43476),r=e.i(71645);let a=[{key:"atropine",name:"아트로핀 점안",time:"취침 전 1회",tag:"atropine"},{key:"dreamlens",name:"드림렌즈 착용",time:"취침 시",tag:"dreamlens"}];var o=e.i(11795);async function n(){let e=(0,o.createClient)(),{data:t,error:r}=await e.from("eyebody_child_guardians").select("role, eyebody_children(id, name, birth_date, gender, treat_atropine, treat_dreamlens)").order("created_at",{ascending:!0});if(r)throw r;return(t??[]).map(e=>({id:e.eyebody_children.id,name:e.eyebody_children.name,birth:e.eyebody_children.birth_date,gender:e.eyebody_children.gender,treatAtropine:e.eyebody_children.treat_atropine??!1,treatDreamlens:e.eyebody_children.treat_dreamlens??!1,role:e.role}))}async function i(e){let t=(0,o.createClient)(),{data:{user:r}}=await t.auth.getUser();if(!r)throw Error("로그인이 필요합니다");let a=crypto.randomUUID(),{error:n}=await t.from("eyebody_children").insert({id:a,name:e.name,birth_date:e.birth,gender:e.gender,treat_atropine:e.treatAtropine,treat_dreamlens:e.treatDreamlens});if(n)throw n;let{error:i}=await t.from("eyebody_child_guardians").insert({child_id:a,user_id:r.id,role:"owner"});if(i)throw i;return{id:a,...e,role:"owner"}}async function l(e){let t=(0,o.createClient)(),{error:r}=await t.from("eyebody_children").update({name:e.name,birth_date:e.birth,gender:e.gender,treat_atropine:e.treatAtropine,treat_dreamlens:e.treatDreamlens}).eq("id",e.id);if(r)throw r}async function s(e){let t=(0,o.createClient)(),{error:r}=await t.from("eyebody_children").delete().eq("id",e);if(r)throw r}async function d(e){let t=(0,o.createClient)(),[r,a,n]=await Promise.all([t.from("eyebody_exam_records").select("id,exam_date,clinic,ax_od,ax_os,sph_od,sph_os,cyl_od,cyl_os,ser_od,ser_os,note,next_appointment").eq("child_id",e).order("exam_date",{ascending:!1}),t.from("eyebody_treatment_logs").select("log_date, atropine, dreamlens").eq("child_id",e),t.from("eyebody_activity_logs").select("log_date, outdoor_hours, phone_hours, sleep_hours").eq("child_id",e)]),i=(r.data??[]).map(e=>({id:e.id,date:e.exam_date,clinic:e.clinic??"",axOD:null!=e.ax_od?String(e.ax_od):"",axOS:null!=e.ax_os?String(e.ax_os):"",sphOD:null!=e.sph_od?String(e.sph_od):"",sphOS:null!=e.sph_os?String(e.sph_os):"",cylOD:null!=e.cyl_od?String(e.cyl_od):"",cylOS:null!=e.cyl_os?String(e.cyl_os):"",serOD:null!=e.ser_od?String(e.ser_od):"",serOS:null!=e.ser_os?String(e.ser_os):"",note:e.note??"",nextAppointment:e.next_appointment??""}));return{exams:i,logs:Object.fromEntries((a.data??[]).map(e=>[e.log_date,{atropine:e.atropine,dreamlens:e.dreamlens}])),lifestyle:Object.fromEntries((n.data??[]).map(e=>[e.log_date,{outdoor:parseFloat(e.outdoor_hours),phone:parseFloat(e.phone_hours),sleep:parseFloat(e.sleep_hours)}]))}}async function c(e,t,r,a){let n=(0,o.createClient)(),{error:i}=await n.from("eyebody_treatment_logs").upsert({child_id:e,log_date:t,atropine:r,dreamlens:a},{onConflict:"child_id,log_date"});if(i)throw i}async function u(e,t){let r=(0,o.createClient)(),a=t.sphOD?parseFloat(t.sphOD):null,n=t.sphOS?parseFloat(t.sphOS):null,i=t.cylOD?parseFloat(t.cylOD):null,l=t.cylOS?parseFloat(t.cylOS):null,{data:s,error:d}=await r.from("eyebody_exam_records").insert({child_id:e,exam_date:t.date,clinic:t.clinic||null,ax_od:t.axOD?parseFloat(t.axOD):null,ax_os:t.axOS?parseFloat(t.axOS):null,sph_od:a,sph_os:n,cyl_od:i,cyl_os:l,ser_od:null!=a?a+(i??0)/2:null,ser_os:null!=n?n+(l??0)/2:null,note:t.note||null,next_appointment:t.nextAppointment||null}).select().single();if(d)throw d;return{id:s.id,date:s.exam_date,clinic:s.clinic??"",axOD:null!=s.ax_od?String(s.ax_od):"",axOS:null!=s.ax_os?String(s.ax_os):"",sphOD:null!=s.sph_od?String(s.sph_od):"",sphOS:null!=s.sph_os?String(s.sph_os):"",cylOD:null!=s.cyl_od?String(s.cyl_od):"",cylOS:null!=s.cyl_os?String(s.cyl_os):"",serOD:null!=s.ser_od?String(s.ser_od):"",serOS:null!=s.ser_os?String(s.ser_os):"",note:s.note??"",nextAppointment:s.next_appointment??""}}async function p(e,t){let r=(0,o.createClient)(),a=t.sphOD?parseFloat(t.sphOD):null,n=t.sphOS?parseFloat(t.sphOS):null,i=t.cylOD?parseFloat(t.cylOD):null,l=t.cylOS?parseFloat(t.cylOS):null,{data:s,error:d}=await r.from("eyebody_exam_records").update({exam_date:t.date,clinic:t.clinic||null,ax_od:t.axOD?parseFloat(t.axOD):null,ax_os:t.axOS?parseFloat(t.axOS):null,sph_od:a,sph_os:n,cyl_od:i,cyl_os:l,ser_od:null!=a?a+(i??0)/2:null,ser_os:null!=n?n+(l??0)/2:null,note:t.note||null,next_appointment:t.nextAppointment||null}).eq("id",e).select().single();if(d)throw d;return{id:s.id,date:s.exam_date,clinic:s.clinic??"",axOD:null!=s.ax_od?String(s.ax_od):"",axOS:null!=s.ax_os?String(s.ax_os):"",sphOD:null!=s.sph_od?String(s.sph_od):"",sphOS:null!=s.sph_os?String(s.sph_os):"",cylOD:null!=s.cyl_od?String(s.cyl_od):"",cylOS:null!=s.cyl_os?String(s.cyl_os):"",serOD:null!=s.ser_od?String(s.ser_od):"",serOS:null!=s.ser_os?String(s.ser_os):"",note:s.note??"",nextAppointment:s.next_appointment??""}}async function f(e){let t=(0,o.createClient)(),{error:r}=await t.from("eyebody_exam_records").delete().eq("id",e);if(r)throw r}async function h(e,t,r){let a=(0,o.createClient)(),{error:n}=await a.from("eyebody_activity_logs").upsert({child_id:e,log_date:t,outdoor_hours:r.outdoor,phone_hours:r.phone,sleep_hours:r.sleep??0},{onConflict:"child_id,log_date"});if(n)throw n}async function m(e,t){let r=(0,o.createClient)(),{error:a}=await r.from("eyebody_activity_logs").delete().eq("child_id",e).eq("log_date",t);if(a)throw a}async function y(e="editor"){let t=(0,o.createClient)(),{data:{user:r}}=await t.auth.getUser();if(!r)throw Error("로그인이 필요합니다");let a=Math.random().toString(36).slice(2,8).toUpperCase(),{error:n}=await t.from("eyebody_invite_codes").insert({code:a,owner_id:r.id,role:e});if(n)throw n;return a}async function g(e){let t=(0,o.createClient)(),{data:{user:r}}=await t.auth.getUser();if(!r)throw Error("로그인이 필요합니다");let{data:a,error:n}=await t.from("eyebody_invite_codes").select("id, owner_id, role").eq("code",e.toUpperCase().trim()).is("used_at",null).gt("expires_at",new Date().toISOString()).single();if(n||!a)throw Error("유효하지 않은 코드입니다");if(a.owner_id===r.id)throw Error("자신의 초대 코드는 사용할 수 없습니다");let{data:i}=await t.from("eyebody_child_guardians").select("child_id").eq("user_id",a.owner_id).eq("role","owner");if(!i?.length)throw Error("초대자의 자녀 정보를 찾을 수 없습니다");let l=0;for(let{child_id:e}of i){let{data:o}=await t.from("eyebody_child_guardians").select("id").eq("child_id",e).eq("user_id",r.id).maybeSingle();!o&&(await t.from("eyebody_child_guardians").insert({child_id:e,user_id:r.id,role:a.role}),l++)}return await t.from("eyebody_invite_codes").update({used_at:new Date().toISOString(),used_by:r.id}).eq("id",a.id),l}e.s(["acceptInviteCode",0,g,"addChild",0,i,"createInviteCode",0,y,"deleteChild",0,s,"deleteExam",0,f,"deleteLifestyle",0,m,"fetchChildData",0,d,"fetchChildren",0,n,"saveExam",0,u,"saveLifestyle",0,h,"saveTreatmentLog",0,c,"updateChild",0,l,"updateExam",0,p],35254);let _=(0,r.createContext)(null);function x(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function b(e){let[t,r,a]=e.split("-").map(Number);return new Date(t,r-1,a)}e.s(["ChildProvider",0,function({children:e}){let[o,y]=(0,r.useState)([]),[g,x]=(0,r.useState)(null),[b,v]=(0,r.useState)({}),[w,S]=(0,r.useState)([]),[O,C]=(0,r.useState)({}),[j,D]=(0,r.useState)(!0),E=(0,r.useCallback)(async e=>{let t=await d(e);v(t.logs),S(t.exams),C(t.lifestyle)},[]),N=(0,r.useCallback)(async()=>{D(!0);try{let e=await n();y(e);let t=localStorage.getItem("mn_active"),r=e.find(e=>e.id===t)?.id??e[0]?.id??null;x(r),r&&(localStorage.setItem("mn_active",r),await E(r))}finally{D(!1)}},[E]);(0,r.useEffect)(()=>{N()},[N]);let k=(0,r.useCallback)(async e=>{x(e),localStorage.setItem("mn_active",e),await E(e)},[E]),P=o.find(e=>e.id===g)??null,A=P?a.filter(e=>"atropine"===e.key&&P.treatAtropine||"dreamlens"===e.key&&P.treatDreamlens):[],$=async e=>{let t=await i(e);y(e=>[...e,t]),await k(t.id)},F=async e=>{await l(e),y(t=>t.map(t=>t.id===e.id?{...t,...e}:t))},I=async e=>{await s(e);let t=o.filter(t=>t.id!==e);if(y(t),g===e){let e=t[0]?.id??null;x(e),e?(localStorage.setItem("mn_active",e),await E(e)):(v({}),S([]),C({}))}},T=async(e,t,r)=>{g&&(v(a=>({...a,[e]:{atropine:t,dreamlens:r}})),await c(g,e,t,r))},L=e=>[...e].sort((e,t)=>t.date.localeCompare(e.date)),M=async e=>{if(!g)throw Error("자녀를 선택해주세요");let t=await u(g,e);return S(e=>L([t,...e])),t},U=async(e,t)=>{let r=await p(e,t);S(t=>L(t.map(t=>t.id===e?r:t)))},R=async e=>{await f(e),S(t=>t.filter(t=>t.id!==e))},q=async(e,t)=>{g&&(C(r=>({...r,[e]:t})),await h(g,e,t))},z=async e=>{g&&(await m(g,e),C(t=>{let r={...t};return delete r[e],r}))};return(0,t.jsx)(_.Provider,{value:{children:o,activeChildId:g,activeChild:P,activeTreatments:A,logs:b,exams:w,lifestyle:O,isLoading:j,switchChild:k,refreshChildren:N,addChild:$,updateChild:F,deleteChild:I,saveTreatmentLog:T,saveExam:M,updateExam:U,deleteExam:R,saveLifestyle:q,deleteLifestyle:z},children:e})},"useChild",0,function(){let e=(0,r.useContext)(_);if(!e)throw Error("useChild must be used within ChildProvider");return e}],20414),e.s(["calcAgeLabel",0,function(e){let t;return`만 ${t=b(e),Math.floor((new Date().getTime()-t.getTime())/315576e5)}세`},"formatDate",0,x,"parseDate",0,b,"today",0,function(){return x(new Date)}],62479)},5766,e=>{"use strict";let t,r;var a,o=e.i(71645);let n={data:""},i=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,l=/\/\*[^]*?\*\/|  +/g,s=/\n+/g,d=(e,t)=>{let r="",a="",o="";for(let n in e){let i=e[n];"@"==n[0]?"i"==n[1]?r=n+" "+i+";":a+="f"==n[1]?d(i,n):n+"{"+d(i,"k"==n[1]?"":t)+"}":"object"==typeof i?a+=d(i,t?t.replace(/([^,])+/g,e=>n.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+" "+t:t)):n):null!=i&&(n="-"==n[1]?n:n.replace(/[A-Z]/g,"-$&").toLowerCase(),o+=d.p?d.p(n,i):n+":"+i+";")}return r+(t&&o?t+"{"+o+"}":o)+a},c={},u=e=>{if("object"==typeof e){let t="";for(let r in e)t+=r+u(e[r]);return t}return e};function p(e){let t,r,a=this||{},o=e.call?e(a.p):e;return((e,t,r,a,o)=>{var n;let p=u(e),f=c[p]||(c[p]=(e=>{let t=0,r=11;for(;t<e.length;)r=101*r+e.charCodeAt(t++)>>>0;return"go"+r})(p));if(!c[f]){let t=p!==e?e:(e=>{let t,r,a=[{}];for(;t=i.exec(e.replace(l,""));)t[4]?a.shift():t[3]?(r=t[3].replace(s," ").trim(),a.unshift(a[0][r]=a[0][r]||{})):a[0][t[1]]=t[2].replace(s," ").trim();return a[0]})(e);c[f]=d(o?{["@keyframes "+f]:t}:t,r?"":"."+f)}let h=r&&c.g;return r&&(c.g=c[f]),n=c[f],h?t.data=t.data.replace(h,n):-1===t.data.indexOf(n)&&(t.data=a?n+t.data:t.data+n),f})(o.unshift?o.raw?(t=[].slice.call(arguments,1),r=a.p,o.reduce((e,a,o)=>{let n=t[o];if(n&&n.call){let e=n(r),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;n=t?"."+t:e&&"object"==typeof e?e.props?"":d(e,""):!1===e?"":e}return e+a+(null==n?"":n)},"")):o.reduce((e,t)=>Object.assign(e,t&&t.call?t(a.p):t),{}):o,(e=>{if("object"==typeof window){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||n})(a.target),a.g,a.o,a.k)}p.bind({g:1});let f,h,m,y=p.bind({k:1});function g(e,t){let r=this||{};return function(){let a=arguments;function o(n,i){let l=Object.assign({},n),s=l.className||o.className;r.p=Object.assign({theme:h&&h()},l),r.o=/go\d/.test(s),l.className=p.apply(r,a)+(s?" "+s:""),t&&(l.ref=i);let d=e;return e[0]&&(d=l.as||e,delete l.as),m&&d[0]&&m(l),f(d,l)}return t?t(o):o}}var _=(e,t)=>"function"==typeof e?e(t):e,x=(t=0,()=>(++t).toString()),b=()=>{if(void 0===r&&"u">typeof window){let e=matchMedia("(prefers-reduced-motion: reduce)");r=!e||e.matches}return r},v="default",w=(e,t)=>{let{toastLimit:r}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,r)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:a}=t;return w(e,{type:+!!e.toasts.find(e=>e.id===a.id),toast:a});case 3:let{toastId:o}=t;return{...e,toasts:e.toasts.map(e=>e.id===o||void 0===o?{...e,dismissed:!0,visible:!1}:e)};case 4:return void 0===t.toastId?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let n=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+n}))}}},S=[],O={toasts:[],pausedAt:void 0,settings:{toastLimit:20}},C={},j=(e,t=v)=>{C[t]=w(C[t]||O,e),S.forEach(([e,r])=>{e===t&&r(C[t])})},D=e=>Object.keys(C).forEach(t=>j(e,t)),E=(e=v)=>t=>{j(t,e)},N={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},k=e=>(t,r)=>{let a,o=((e,t="blank",r)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...r,id:(null==r?void 0:r.id)||x()}))(t,e,r);return E(o.toasterId||(a=o.id,Object.keys(C).find(e=>C[e].toasts.some(e=>e.id===a))))({type:2,toast:o}),o.id},P=(e,t)=>k("blank")(e,t);P.error=k("error"),P.success=k("success"),P.loading=k("loading"),P.custom=k("custom"),P.dismiss=(e,t)=>{let r={type:3,toastId:e};t?E(t)(r):D(r)},P.dismissAll=e=>P.dismiss(void 0,e),P.remove=(e,t)=>{let r={type:4,toastId:e};t?E(t)(r):D(r)},P.removeAll=e=>P.remove(void 0,e),P.promise=(e,t,r)=>{let a=P.loading(t.loading,{...r,...null==r?void 0:r.loading});return"function"==typeof e&&(e=e()),e.then(e=>{let o=t.success?_(t.success,e):void 0;return o?P.success(o,{id:a,...r,...null==r?void 0:r.success}):P.dismiss(a),e}).catch(e=>{let o=t.error?_(t.error,e):void 0;o?P.error(o,{id:a,...r,...null==r?void 0:r.error}):P.dismiss(a)}),e};var A=1e3,$=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,F=y`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,I=y`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,T=g("div")`
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
    animation: ${F} 0.15s ease-out forwards;
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
    animation: ${I} 0.15s ease-out forwards;
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
`,U=y`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,R=y`
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
}`,q=g("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${U} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${R} 0.2s ease-out forwards;
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
`,z=g("div")`
  position: absolute;
`,B=g("div")`
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
}`,H=g("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${K} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,W=({toast:e})=>{let{icon:t,type:r,iconTheme:a}=e;return void 0!==t?"string"==typeof t?o.createElement(H,null,t):t:"blank"===r?null:o.createElement(B,null,o.createElement(M,{...a}),"loading"!==r&&o.createElement(z,null,"error"===r?o.createElement(T,{...a}):o.createElement(q,{...a})))},X=g("div")`
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
`,Y=g("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,G=o.memo(({toast:e,position:t,style:r,children:a})=>{let n=e.height?((e,t)=>{let r=e.includes("top")?1:-1,[a,o]=b()?["0%{opacity:0;} 100%{opacity:1;}","0%{opacity:1;} 100%{opacity:0;}"]:[`
0% {transform: translate3d(0,${-200*r}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${-150*r}%,-1px) scale(.6); opacity:0;}
`];return{animation:t?`${y(a)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${y(o)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}})(e.position||t||"top-center",e.visible):{opacity:0},i=o.createElement(W,{toast:e}),l=o.createElement(Y,{...e.ariaProps},_(e.message,e));return o.createElement(X,{className:e.className,style:{...n,...r,...e.style}},"function"==typeof a?a({icon:i,message:l}):o.createElement(o.Fragment,null,i,l))});a=o.createElement,d.p=void 0,f=a,h=void 0,m=void 0;var J=({id:e,className:t,style:r,onHeightUpdate:a,children:n})=>{let i=o.useCallback(t=>{if(t){let r=()=>{a(e,t.getBoundingClientRect().height)};r(),new MutationObserver(r).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,a]);return o.createElement("div",{ref:i,className:t,style:r},n)},Q=p`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;e.s(["Toaster",0,({reverseOrder:e,position:t="top-center",toastOptions:r,gutter:a,children:n,toasterId:i,containerStyle:l,containerClassName:s})=>{let{toasts:d,handlers:c}=((e,t="default")=>{let{toasts:r,pausedAt:a}=((e={},t=v)=>{let[r,a]=(0,o.useState)(C[t]||O),n=(0,o.useRef)(C[t]);(0,o.useEffect)(()=>(n.current!==C[t]&&a(C[t]),S.push([t,a]),()=>{let e=S.findIndex(([e])=>e===t);e>-1&&S.splice(e,1)}),[t]);let i=r.toasts.map(t=>{var r,a,o;return{...e,...e[t.type],...t,removeDelay:t.removeDelay||(null==(r=e[t.type])?void 0:r.removeDelay)||(null==e?void 0:e.removeDelay),duration:t.duration||(null==(a=e[t.type])?void 0:a.duration)||(null==e?void 0:e.duration)||N[t.type],style:{...e.style,...null==(o=e[t.type])?void 0:o.style,...t.style}}});return{...r,toasts:i}})(e,t),n=(0,o.useRef)(new Map).current,i=(0,o.useCallback)((e,t=A)=>{if(n.has(e))return;let r=setTimeout(()=>{n.delete(e),l({type:4,toastId:e})},t);n.set(e,r)},[]);(0,o.useEffect)(()=>{if(a)return;let e=Date.now(),o=r.map(r=>{if(r.duration===1/0)return;let a=(r.duration||0)+r.pauseDuration-(e-r.createdAt);if(a<0){r.visible&&P.dismiss(r.id);return}return setTimeout(()=>P.dismiss(r.id,t),a)});return()=>{o.forEach(e=>e&&clearTimeout(e))}},[r,a,t]);let l=(0,o.useCallback)(E(t),[t]),s=(0,o.useCallback)(()=>{l({type:5,time:Date.now()})},[l]),d=(0,o.useCallback)((e,t)=>{l({type:1,toast:{id:e,height:t}})},[l]),c=(0,o.useCallback)(()=>{a&&l({type:6,time:Date.now()})},[a,l]),u=(0,o.useCallback)((e,t)=>{let{reverseOrder:a=!1,gutter:o=8,defaultPosition:n}=t||{},i=r.filter(t=>(t.position||n)===(e.position||n)&&t.height),l=i.findIndex(t=>t.id===e.id),s=i.filter((e,t)=>t<l&&e.visible).length;return i.filter(e=>e.visible).slice(...a?[s+1]:[0,s]).reduce((e,t)=>e+(t.height||0)+o,0)},[r]);return(0,o.useEffect)(()=>{r.forEach(e=>{if(e.dismissed)i(e.id,e.removeDelay);else{let t=n.get(e.id);t&&(clearTimeout(t),n.delete(e.id))}})},[r,i]),{toasts:r,handlers:{updateHeight:d,startPause:s,endPause:c,calculateOffset:u}}})(r,i);return o.createElement("div",{"data-rht-toaster":i||"",style:{position:"fixed",zIndex:9999,top:16,left:16,right:16,bottom:16,pointerEvents:"none",...l},className:s,onMouseEnter:c.startPause,onMouseLeave:c.endPause},d.map(r=>{let i,l,s=r.position||t,d=c.calculateOffset(r,{reverseOrder:e,gutter:a,defaultPosition:t}),u=(i=s.includes("top"),l=s.includes("center")?{justifyContent:"center"}:s.includes("right")?{justifyContent:"flex-end"}:{},{left:0,right:0,display:"flex",position:"absolute",transition:b()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${d*(i?1:-1)}px)`,...i?{top:0}:{bottom:0},...l});return o.createElement(J,{id:r.id,key:r.id,onHeightUpdate:c.updateHeight,className:r.visible?Q:"",style:u},"custom"===r.type?_(r.message,r):n?n(r):o.createElement(G,{toast:r,position:s}))}))},"default",0,P],5766)},18566,(e,t,r)=>{t.exports=e.r(76562)},95057,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={formatUrl:function(){return l},formatWithValidation:function(){return d},urlObjectKeys:function(){return s}};for(var o in a)Object.defineProperty(r,o,{enumerable:!0,get:a[o]});let n=e.r(90809)._(e.r(98183)),i=/https?|ftp|gopher|file/;function l(e){let{auth:t,hostname:r}=e,a=e.protocol||"",o=e.pathname||"",l=e.hash||"",s=e.query||"",d=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?d=t+e.host:r&&(d=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(d+=":"+e.port)),s&&"object"==typeof s&&(s=String(n.urlQueryToSearchParams(s)));let c=e.search||s&&`?${s}`||"";return a&&!a.endsWith(":")&&(a+=":"),e.slashes||(!a||i.test(a))&&!1!==d?(d="//"+(d||""),o&&"/"!==o[0]&&(o="/"+o)):d||(d=""),l&&"#"!==l[0]&&(l="#"+l),c&&"?"!==c[0]&&(c="?"+c),o=o.replace(/[?#]/g,encodeURIComponent),c=c.replace("#","%23"),`${a}${d}${o}${c}${l}`}let s=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function d(e){return l(e)}},18581,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return o}});let a=e.r(71645);function o(e,t){let r=(0,a.useRef)(null),o=(0,a.useRef)(null);return(0,a.useCallback)(a=>{if(null===a){let e=r.current;e&&(r.current=null,e());let t=o.current;t&&(o.current=null,t())}else e&&(r.current=n(e,a)),t&&(o.current=n(t,a))},[e,t])}function n(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},73668,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return n}});let a=e.r(18967),o=e.r(52817);function n(e){if(!(0,a.isAbsoluteUrl)(e))return!0;try{let t=(0,a.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,o.hasBasePath)(r.pathname)}catch(e){return!1}}},84508,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return a}});let a=e=>{}},22016,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var a={default:function(){return g},useLinkStatus:function(){return x}};for(var o in a)Object.defineProperty(r,o,{enumerable:!0,get:a[o]});let n=e.r(90809),i=e.r(43476),l=n._(e.r(71645)),s=e.r(95057),d=e.r(8372),c=e.r(18581),u=e.r(18967),p=e.r(5550);e.r(33525);let f=e.r(88540),h=e.r(91949),m=e.r(73668),y=e.r(9396);function g(t){var r,a;let o,n,g,[x,b]=(0,l.useOptimistic)(h.IDLE_LINK_STATUS),v=(0,l.useRef)(null),{href:w,as:S,children:O,prefetch:C=null,passHref:j,replace:D,shallow:E,scroll:N,onClick:k,onMouseEnter:P,onTouchStart:A,legacyBehavior:$=!1,onNavigate:F,transitionTypes:I,ref:T,unstable_dynamicOnHover:L,...M}=t;o=O,$&&("string"==typeof o||"number"==typeof o)&&(o=(0,i.jsx)("a",{children:o}));let U=l.default.useContext(d.AppRouterContext),R=!1!==C,q=!1!==C?null===(a=C)||"auto"===a?y.FetchStrategy.PPR:y.FetchStrategy.Full:y.FetchStrategy.PPR,z="string"==typeof(r=S||w)?r:(0,s.formatUrl)(r);if($){if(o?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});n=l.default.Children.only(o)}let B=$?n&&"object"==typeof n&&n.ref:T,K=l.default.useCallback(e=>(null!==U&&(v.current=(0,h.mountLinkInstance)(e,z,U,q,R,b)),()=>{v.current&&((0,h.unmountLinkForCurrentNavigation)(v.current),v.current=null),(0,h.unmountPrefetchableInstance)(e)}),[R,z,U,q,b]),H={ref:(0,c.useMergedRef)(K,B),onClick(t){$||"function"!=typeof k||k(t),$&&n.props&&"function"==typeof n.props.onClick&&n.props.onClick(t),!U||t.defaultPrevented||function(t,r,a,o,n,i,s){if("u">typeof window){let d,{nodeName:c}=t.currentTarget;if("A"===c.toUpperCase()&&((d=t.currentTarget.getAttribute("target"))&&"_self"!==d||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,m.isLocalURL)(r)){o&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),i){let e=!1;if(i({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:u}=e.r(99781);l.default.startTransition(()=>{u(r,o?"replace":"push",!1===n?f.ScrollBehavior.NoScroll:f.ScrollBehavior.Default,a.current,s)})}}(t,z,v,D,N,F,I)},onMouseEnter(e){$||"function"!=typeof P||P(e),$&&n.props&&"function"==typeof n.props.onMouseEnter&&n.props.onMouseEnter(e),U&&R&&(0,h.onNavigationIntent)(e.currentTarget,!0===L)},onTouchStart:function(e){$||"function"!=typeof A||A(e),$&&n.props&&"function"==typeof n.props.onTouchStart&&n.props.onTouchStart(e),U&&R&&(0,h.onNavigationIntent)(e.currentTarget,!0===L)}};return(0,u.isAbsoluteUrl)(z)?H.href=z:$&&!j&&("a"!==n.type||"href"in n.props)||(H.href=(0,p.addBasePath)(z)),g=$?l.default.cloneElement(n,H):(0,i.jsx)("a",{...M,...H,children:o}),(0,i.jsx)(_.Provider,{value:x,children:g})}e.r(84508);let _=(0,l.createContext)(h.IDLE_LINK_STATUS),x=()=>(0,l.useContext)(_);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},13918,e=>{"use strict";e.i(47167);var t=e.i(43476),r=e.i(71645),a=e.i(18566),o=e.i(5766),n=e.i(11795),i=e.i(20414),l=e.i(62479),s=e.i(49721),d=e.i(68757),c=e.i(22016);function u(){let{children:e,activeChild:a,activeChildId:o,switchChild:n}=(0,i.useChild)(),[u,p]=(0,r.useState)(!1);return(0,t.jsxs)("header",{className:"sticky top-0 z-30 bg-white border-b border-gray-100",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between px-4 h-14",children:[(0,t.jsxs)(c.default,{href:"/dashboard",className:"flex items-center gap-2",children:[(0,t.jsx)("img",{src:"https://HalinaCho.github.io/MyoNote/icon.png",alt:"",className:"h-9 w-auto"}),(0,t.jsx)("span",{className:"font-bold text-[#10bcad] text-lg",children:"마이오노트"})]}),(0,t.jsxs)("button",{onClick:()=>p(e=>!e),className:"flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-700",children:[a?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("span",{children:"F"===a.gender?"👧":"👦"}),(0,t.jsx)("span",{children:a.name})]}):(0,t.jsx)("span",{className:"text-gray-400",children:"자녀 선택"}),(0,t.jsx)(s.FontAwesomeIcon,{icon:u?d.faChevronUp:d.faChevronDown,className:"text-gray-400 text-xs"})]})]}),u&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("div",{className:"fixed inset-0 z-20",onClick:()=>p(!1)}),(0,t.jsxs)("div",{className:"absolute right-4 top-14 z-30 w-52 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden",children:[e.map(e=>(0,t.jsxs)("button",{onClick:()=>{n(e.id),p(!1)},className:`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors
                  ${e.id===o?"bg-teal-50 text-teal-700":"text-gray-700"}`,children:[(0,t.jsx)("span",{className:"text-base",children:"F"===e.gender?"👧":"👦"}),(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"font-semibold",children:e.name}),(0,t.jsx)("div",{className:"text-xs text-gray-400",children:(0,l.calcAgeLabel)(e.birth)})]}),e.id===o&&(0,t.jsx)(s.FontAwesomeIcon,{icon:d.faCheck,className:"ml-auto text-teal-600 text-xs"})]},e.id)),(0,t.jsx)("div",{className:"border-t border-gray-100"}),(0,t.jsxs)("button",{onClick:()=>{p(!1),document.dispatchEvent(new CustomEvent("open-add-child"))},className:"w-full flex items-center gap-3 px-4 py-3 text-sm text-teal-600 hover:bg-teal-50 transition-colors",children:[(0,t.jsx)(s.FontAwesomeIcon,{icon:d.faPlus})," 자녀 추가"]})]})]})]})}let p=[{href:"/dashboard",label:"홈",icon:d.faHouse},{href:"/dashboard/calendar",label:"캘린더",icon:d.faCalendarDays},{href:"/dashboard/records",label:"검사",icon:d.faMicroscope},{href:"/dashboard/analytics",label:"분석",icon:d.faChartColumn},{href:"/dashboard/settings",label:"설정",icon:d.faGear}];function f(){let e=(0,a.usePathname)();return(0,t.jsx)("nav",{className:"fixed bottom-0 inset-x-0 z-40 flex justify-center",children:(0,t.jsx)("div",{className:"w-full max-w-[480px] flex bg-white border-t border-gray-200 safe-pb",children:p.map(({href:r,label:a,icon:o})=>{let n="/dashboard"===r?e===r:e.startsWith(r);return(0,t.jsxs)(c.default,{href:r,className:`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors
                ${n?"text-teal-600":"text-gray-400"}`,children:[(0,t.jsx)(s.FontAwesomeIcon,{icon:o,className:"text-xl leading-none"}),(0,t.jsx)("span",{className:`font-medium ${n?"font-semibold":""}`,children:a})]},r)})})})}e.s(["default",0,function({children:e}){let l=(0,a.useRouter)(),[s,d]=(0,r.useState)(!1);return((0,r.useEffect)(()=>{(0,n.createClient)().auth.getSession().then(({data:{session:e}})=>{e?d(!0):window.location.replace("https://HalinaCho.github.io/MyoNote/login")})},[l]),s)?(0,t.jsxs)(i.ChildProvider,{children:[(0,t.jsx)("div",{className:"flex justify-center min-h-screen bg-[#d9efed]",children:(0,t.jsxs)("div",{className:"relative w-full max-w-[480px] min-h-screen flex flex-col bg-[#edf7f6]",children:[(0,t.jsx)(u,{}),(0,t.jsx)("main",{className:"flex-1 overflow-y-auto pb-20 px-4 py-3",children:e}),(0,t.jsx)(f,{})]})}),(0,t.jsx)(o.Toaster,{position:"bottom-center",toastOptions:{style:{maxWidth:360,fontSize:14},duration:2200,success:{iconTheme:{primary:"#10bcad",secondary:"#fff"}}}})]}):null}],13918)}]);