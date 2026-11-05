// Hosting proxies can return HTML or an empty body instead of the API's JSON.
export async function readApiJson(response) {
  try { return await response.json(); }
  catch { throw new Error('The server returned an unexpected response. Please try again shortly.'); }
}
