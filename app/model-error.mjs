export async function modelFailure(response,provider='bailian'){
 let data={};try{data=await response.json();}catch{}
 const rawCode=String(data.error?.code||data.code||'');const code=/^[a-zA-Z0-9_.-]{1,100}$/.test(rawCode)?rawCode:'unknown';
 let message;
 if(['insufficient_quota','AllocationQuota.FreeTierOnly'].includes(code))message='百炼免费额度已用完，剩余课程尚未处理。已完成的内容可以预览；切换到有免费额度的模型后可继续。';
 else if(response.status===401)message='密钥无效或无权限，请联系开发者检查。';
 else if(response.status===403)message='模型平台拒绝调用，请检查模型权限或账号状态。已完成的内容已保留。';
 else if(provider==='zhipu'&&code==='1305')message='智谱免费模型仍然拥挤，本轮自动重试后暂时停止。已完成的内容保留，可以稍后继续；无需更换 Key。';
 else if(response.status===429)message='模型服务繁忙或触发限流，请稍后继续。';
 else message=`模型服务调用失败（${response.status}），已完成的内容已保留。`;
 return Object.assign(Error(message),{code,status:response.status});
}
