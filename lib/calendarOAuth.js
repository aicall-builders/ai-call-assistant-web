import { calendarApi } from './api';

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
}
