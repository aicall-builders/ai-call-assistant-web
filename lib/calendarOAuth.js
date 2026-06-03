import { calendarApi } from './api';
<<<<<<< Updated upstream

export async function completeCalendarOAuth({ provider, code, state }) {
  if (!provider || !code) {
    throw new Error('OAuth code가 없습니다');
  }

  const expectedState = typeof window !== 'undefined'
    ? localStorage.getItem(`calendar_oauth_state_${provider}`)
    : '';

  if (!state || !state.startsWith(`calendar:${provider}:`)) {
    throw new Error('캘린더 OAuth state 형식이 올바르지 않습니다');
  }

  if (expectedState && expectedState !== state) {
    throw new Error('캘린더 OAuth state가 일치하지 않습니다');
  }

  const redirectUri = `${window.location.origin}/oauth/${provider}`;
  await calendarApi.exchangeOAuthCode({ provider, code, redirectUri, state });
  localStorage.removeItem(`calendar_oauth_state_${provider}`);
=======
import { makeOAuthState } from './socialOAuth';

export async function startCalendarConnect(provider) {
  const redirectUri = `${window.location.origin}/oauth/${provider}`;
  const state = makeOAuthState('calendar', provider);
  const res = await calendarApi.getAuthorizeUrl(provider, redirectUri, state);
  const authorizeUrl = res.data?.authorize_url;
  if (!authorizeUrl) throw new Error('캘린더 OAuth URL을 받지 못했습니다.');
  window.location.href = authorizeUrl;
>>>>>>> Stashed changes
}
