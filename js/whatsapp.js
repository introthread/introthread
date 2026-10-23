// Introthread - Send on WhatsApp (v78): card link, confirm links and follow-up drafts. Prefix wa.
// Opens WhatsApp (app or web) with the message filled in; the user picks the chat and presses send.

/* Digits only, for wa.me/<number>. Returns '' when there is no usable number. */
function waDigits(p) {
  const d = String(p || '').replace(/[^0-9]/g, '');
  return d.length >= 7 && d.length <= 15 ? d : '';
}
function waOpen(text, phone) {
  const url = 'https://wa.me/' + waDigits(phone) + '?text=' + encodeURIComponent(text);
  const w = window.open(url, '_blank', 'noopener');
  if (!w) location.href = url;
}
function waPhoneOf(t) {
  const o = (t && t.other) || {};
  return o.phone || o.mobile || '';
}
function waCard() {
  const u = me();
  if (!u) return;
  waOpen('Here is my Introthread card: ' + profileUrl(u));
}
function waConfirm(id) {
  const t = findThread(id);
  if (!t) return toast('That Thread is no longer available.');
  const f = (t.other.name || '').split(' ')[0] || 'there';
  waOpen(
    'Hi ' + f + ', great meeting you. Tap to confirm we met on Introthread: ' + threadLink(t),
    waPhoneOf(t)
  );
}
function waDraft(id) {
  const t = findThread(id);
  const box = document.getElementById('draft');
  const text = box && box.value.trim();
  if (!text) return toast('The draft is empty.');
  waOpen(text, waPhoneOf(t));
}
