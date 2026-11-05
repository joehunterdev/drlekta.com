/* ============================================================
   enquiry-form.js — Mixing & Mastering enquiry form
   Sends via fetch to /mail/contact.php, shows inline errors.
   ============================================================ */
(function () {
  'use strict';

  var form = document.getElementById('enquiry-form');
  if (!form) return;

  var shownAt  = Date.now();
  var status   = form.querySelector('.form-status');
  var button   = form.querySelector('.form-submit');
  var elapsed  = form.querySelector('[name="_elapsed"]');
  var btnLabel = button.textContent;

  function setStatus(msg, type) {
    status.textContent = msg || '';
    status.className = 'form-status' + (type ? ' is-' + type : '');
  }

  function clearErrors() {
    form.querySelectorAll('[data-error-for]').forEach(function (el) { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  function showErrors(errors) {
    var first = null;
    Object.keys(errors || {}).forEach(function (name) {
      var slot  = form.querySelector('[data-error-for="' + name + '"]');
      var input = form.elements[name];
      if (slot) slot.textContent = errors[name];
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        if (!first) first = input;
      }
    });
    if (first) first.focus();
  }

  // quick client-side pass so obvious mistakes don't need a round trip
  function localErrors() {
    var e = {};
    var v = function (n) { return (form.elements[n].value || '').trim(); };
    if (v('name').length < 2) e.name = 'Please tell us your name.';
    if (!form.elements.email.checkValidity() || !v('email')) e.email = 'Please enter a valid email address.';
    if (v('link') && !/^https?:\/\//i.test(v('link'))) e.link = 'Links should start with http:// or https://';
    return e;
  }

  // non-JS fallback redirect lands back here with ?enquiry=sent|error
  var qs = new URLSearchParams(window.location.search).get('enquiry');
  if (qs === 'sent')  setStatus('Thanks — your enquiry has been sent.', 'success');
  if (qs === 'error') setStatus('Sorry, something went wrong. Please try again.', 'error');

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();

    var errs = localErrors();
    if (Object.keys(errs).length) {
      showErrors(errs);
      setStatus('Please check the highlighted fields.', 'error');
      return;
    }

    elapsed.value = String(Math.floor((Date.now() - shownAt) / 1000));
    button.disabled = true;
    button.textContent = 'Sending…';
    setStatus('');

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' },
      credentials: 'same-origin'
    })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false, message: 'Unexpected response — please try again.' }; });
      })
      .then(function (data) {
        if (data.ok) {
          form.reset();
          shownAt = Date.now();
          setStatus(data.message, 'success');
        } else {
          showErrors(data.errors);
          setStatus(data.message, 'error');
        }
      })
      .catch(function () {
        setStatus('Network error — please check your connection and try again.', 'error');
      })
      .then(function () {
        button.disabled = false;
        button.textContent = btnLabel;
      });
  });
})();
