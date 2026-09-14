// Only synthetic fixtures. Keep separate so launch cleanup can remove them together.
export function demoTalentScenario(code) {
  const publicNames = { 'MH-D-2048':'김가온', 'MH-N-3021':'강하늘' };
  const publicContact = Object.hasOwn(publicNames, code || '');
  return {
    contactVisibility: publicContact ? 'ticket' : 'private',
    name: publicContact ? `${publicNames[code]} (테스트)` : '',
    phone: publicContact ? '010-0000-0000' : '',
    email: publicContact ? `${code.toLowerCase()}@example.invalid` : '',
  };
}
