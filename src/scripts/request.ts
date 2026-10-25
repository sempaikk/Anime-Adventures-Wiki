/** Bound waiting for both headers and the body. Mutations are never retried:
 * an interrupted response does not prove that a write did not reach the server. */
export async function requestJson(url:string, options:RequestInit = {}, timeout=15000) {
  const controller=new AbortController();
  const abort=()=>controller.abort(options.signal?.reason);
  if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort,{once:true});
  const timer=window.setTimeout(()=>controller.abort(),timeout);
  try {
    const response=await fetch(url,{...options,signal:controller.signal});
    const data=await response.json();
    return {response,data};
  } finally {clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
}
