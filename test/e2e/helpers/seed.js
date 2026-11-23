export function uniqueUser(prefix = 'e2e') {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    username: `${prefix}_${stamp}`,
    password: 'e2e-pass-123',
  };
}

export async function registerUser(request, prefix = 'e2e') {
  const user = uniqueUser(prefix);
  const res = await request.post('/api/auth/register', {
    data: { username: user.username, password: user.password },
  });

  const body = await res.json();
  return {
    ...user,
    token: body?.data?.token || null,
    userId: body?.data?.user?.id || null,
  };
}

export async function authenticate(page, token) {
  await page.addInitScript((value) => {
    localStorage.setItem(
      'palace_auth',
      JSON.stringify({
        token: value,
        user: { id: 1, username: 'e2e', role: 'user' },
      })
    );
  }, token);
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}