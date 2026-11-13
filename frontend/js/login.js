(() => {
 'use strict';const form=document.getElementById('loginForm'),message=document.getElementById('loginMessage'),button=form.querySelector('[type=submit]');
 if(new URLSearchParams(location.search).has('expired'))message.textContent='Your session ended. Please sign in again.';
 campusAuth.currentUser().then(user=>{if(user)location.replace(campusAuth.dashboardPath(user.role));}).catch(e=>{message.textContent=e.message;});
 form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;message.textContent='Signing in…';try{const data=await campusAuth.request('/api/auth/login',{method:'POST',body:JSON.stringify({email:form.elements.namedItem('email').value.trim(),password:form.elements.namedItem('password').value})},{redirectOnUnauthorized:false});campusAuth.saveSession(data.token,data.user.role);location.assign(campusAuth.dashboardPath(data.user.role));}catch(e){message.textContent=e.message;}finally{button.disabled=false;}});
})();
